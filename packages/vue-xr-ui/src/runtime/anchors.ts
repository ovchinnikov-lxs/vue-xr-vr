import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { Matrix4, Quaternion, Vector3 } from 'three'
import type { XrController } from './context'
import { spaceToWorld } from './xr-pose'

const STORAGE_KEY = 'vue-xr-ui:anchors'
// Persistent handles replaced outside a session: deleted at the next one
// (the Quest caps how many a site may keep).
const ORPHANS_KEY = 'vue-xr-ui:anchors:orphans'

function orphan(handle: string) {
  try {
    const list = JSON.parse(localStorage.getItem(ORPHANS_KEY) ?? '[]') as string[]
    if (!list.includes(handle)) localStorage.setItem(ORPHANS_KEY, JSON.stringify([...list, handle]))
  } catch {
    // Storage blocked: nothing to clean up later either.
  }
}

function deleteOrphans(session: XRSession) {
  const persistent = session as XRSession & { deletePersistentAnchor?(handle: string): Promise<void> }
  if (!persistent.deletePersistentAnchor) return
  let list: string[] = []
  try {
    list = JSON.parse(localStorage.getItem(ORPHANS_KEY) ?? '[]') as string[]
    localStorage.removeItem(ORPHANS_KEY)
  } catch {
    return
  }
  for (const handle of list) void persistent.deletePersistentAnchor(handle).catch(() => {})
}

/** What is kept per anchor id: the headset's persistent handle, and the pose in the floor space as a fallback. */
interface Saved {
  handle?: string
  pose?: number[]
}

function readAll(): Record<string, Saved> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Saved>
  } catch {
    return {}
  }
}

function write(id: string, saved: Saved | undefined) {
  try {
    const all = readAll()
    if (saved) all[id] = saved
    else delete all[id]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage blocked (private mode): the anchor lives for this session only.
  }
}

// Persistent anchors are in WebXR Anchors level 2 (Quest Browser, IWER) but not in @types/webxr yet.
type PersistentSession = XRSession & {
  restorePersistentAnchor?(handle: string): Promise<XRAnchor>
  deletePersistentAnchor?(handle: string): Promise<void>
}
type PersistentAnchor = XRAnchor & { requestPersistentHandle?(): Promise<string> }

export interface XrAnchorHandle {
  /** World pose of the anchor, valid while `anchored` is true. Updated every frame. */
  readonly matrix: Matrix4
  /** There is a pose for it now: the headset's anchor in a session, else the saved pose. */
  readonly anchored: Readonly<Ref<boolean>>
  /** Something is saved under this id. */
  readonly saved: Readonly<Ref<boolean>>
  /** Anchors here (world space), replacing the saved place. Persists across sessions where the headset allows it. */
  place(position: Vector3, quaternion: Quaternion): Promise<void>
  /** Drops the saved place (and the headset's persistent anchor). */
  forget(): Promise<void>
  /** Called every frame by the owner, with the frame's XRFrame. */
  update(frame: XRFrame | undefined): void
}

// Every live handle per id, so that two handles on one id (a window, and a
// "reset" button elsewhere) see each other's place and forget.
const live = new Map<string, Set<() => void>>()
const notify = (id: string, except: () => void) => {
  for (const reload of live.get(id) ?? []) if (reload !== except) reload()
}

const restores = new Map<string, { session: XRSession; anchor: Promise<XRAnchor> }>()

const pose = new Matrix4()
const one = new Vector3(1, 1, 1)

/**
 * Keeps a place in the room under an id, across sessions and reloads.
 *
 * In a session with anchors, it creates a WebXR anchor there (the headset
 * keeps it glued to the room even when tracking corrects itself or the user
 * recentres), asks for a persistent handle (Quest: survives the session) and
 * stores it in localStorage. Without anchors it stores the pose in the floor
 * space instead, which holds until the user recentres or stands elsewhere.
 */
export function createXrAnchor(xr: XrController, id: () => string): XrAnchorHandle {
  const matrix = new Matrix4()
  const anchored = ref(false)
  let entry: Saved | undefined = readAll()[id()]
  const saved = ref(entry != null)
  const keep = (next: Saved | undefined) => {
    entry = next
    saved.value = next != null
    write(id(), next)
    notify(id(), reload)
  }
  let anchor: XRAnchor | undefined
  let pending: { pose: Matrix4; entry: Saved } | undefined
  // Another handle on this id changed it.
  const reload = () => {
    const next = readAll()[id()]
    if (next?.handle !== entry?.handle) drop()
    entry = next
    saved.value = next != null
    if (!anchor && xr.session.value) void restore(xr.session.value)
  }
  const join = (key: string) => {
    if (!live.has(key)) live.set(key, new Set())
    live.get(key)!.add(reload)
    return () => {
      live.get(key)?.delete(reload)
      if (live.get(key)?.size === 0) live.delete(key)
    }
  }
  let leave = join(id())

  // Forgets this handle's anchor. It is not deleted: another handle on the
  // id may share it, and anchors end with the session. Replacing and
  // forgetting delete the persistent one.
  const drop = () => {
    anchor = undefined
  }

  const createAnchor = (frame: XRFrame, { pose: at, entry: next }: NonNullable<typeof pending>) => {
    const session = xr.session.value as PersistentSession | undefined
    const space = xr.store.value?.getState().originReferenceSpace
    if (!session || !space || !frame.createAnchor) return
    let request: Promise<XRAnchor> | undefined
    try {
      request = frame.createAnchor(new XRRigidTransform(position0(at), rotation0(at)), space)
    } catch {
      return // No anchors in this session: the stored pose is all there is.
    }
    void request?.then(
      async (created: PersistentAnchor) => {
        if (xr.session.value !== session || entry !== next) return created.delete()
        anchor = created
        const handle = await created.requestPersistentHandle?.().catch(() => undefined)
        if (!handle) return
        if (entry === next) keep({ ...next, handle })
        // Replaced again while the handle was coming: it is nobody's.
        else await session.deletePersistentAnchor?.(handle).catch(() => {})
      },
      () => {},
    )
  }

  const restore = async (session: XRSession) => {
    const handle = entry?.handle
    const persistent = session as PersistentSession
    if (!handle || !persistent.restorePersistentAnchor) return
    try {
      // One restore per handle and session, shared by every handle on this id
      // (a second concurrent restore of the same anchor is an error).
      let restoring = restores.get(handle)
      if (restoring?.session !== session) {
        restoring = { session, anchor: persistent.restorePersistentAnchor(handle) }
        restores.set(handle, restoring)
      }
      const restored = await restoring.anchor
      if (xr.session.value === session && entry?.handle === handle) anchor = restored
    } catch {
      // Unknown on this headset (another room, cleared data): the pose stands in.
    }
  }

  watch(
    () => xr.session.value,
    (session) => {
      drop()
      anchored.value = false
      if (session) {
        deleteOrphans(session)
        void restore(session)
      }
    },
    { immediate: true },
  )
  watch(id, (key) => {
    leave()
    leave = join(key)
    drop()
    entry = readAll()[id()]
    saved.value = entry != null
    if (xr.session.value) void restore(xr.session.value)
  })
  onBeforeUnmount(() => {
    leave()
    drop()
  })

  return {
    matrix,
    anchored,
    saved,
    update(frame) {
      // A session tick without an XRFrame (window rAF): keep last frame's pose.
      if (!frame && xr.session.value) return
      const store = xr.store.value
      if (pending && frame) {
        createAnchor(frame, pending)
        pending = undefined
      }
      // The headset's anchor when it tracks it; else (no session, no anchors,
      // still restoring, tracking lost) the stored floor-space pose.
      if (anchor && frame && store) {
        try {
          if (spaceToWorld(store, frame, anchor.anchorSpace, matrix)) {
            anchored.value = true
            return
          }
        } catch {
          // Deleted under us (replaced through another handle on this id).
          drop()
        }
      }
      if (!entry?.pose) {
        anchored.value = false
        return
      }
      matrix.fromArray(entry.pose)
      const origin = store?.getState().origin
      if (origin) {
        origin.updateWorldMatrix(true, false)
        matrix.premultiply(origin.matrixWorld)
      }
      anchored.value = true
    },
    async place(position, quaternion) {
      const store = xr.store.value
      const origin = store?.getState().origin
      // World to the floor space the session (or the page) uses.
      pose.compose(position, quaternion, one)
      if (origin) {
        origin.updateWorldMatrix(true, false)
        pose.premultiply(new Matrix4().copy(origin.matrixWorld).invert())
      }
      const replaced = entry?.handle
      const next: Saved = { pose: Array.from(pose.elements) }
      keep(next)
      // The new pose stands in until the new anchor exists.
      drop()
      if (replaced) {
        const session = xr.session.value as PersistentSession | undefined
        if (session?.deletePersistentAnchor) void session.deletePersistentAnchor(replaced).catch(() => {})
        else orphan(replaced)
      }

      // The anchor is created on the next frame, inside its callback: an
      // XRFrame is only usable synchronously there (awaiting one first
      // breaks in the emulator, where frame callbacks share one task).
      if (!xr.session.value) return
      pending = { pose: pose.clone(), entry: next }
    },
    async forget() {
      const previous = entry
      anchor?.delete()
      drop()
      keep(undefined)
      anchored.value = false
      const session = xr.session.value as PersistentSession | undefined
      if (!previous?.handle) return
      if (session?.deletePersistentAnchor) await session.deletePersistentAnchor(previous.handle).catch(() => {})
      else orphan(previous.handle)
    },
  }
}

const p = new Vector3()
const q = new Quaternion()
const s = new Vector3()
function position0(m: Matrix4): DOMPointInit {
  m.decompose(p, q, s)
  return { x: p.x, y: p.y, z: p.z, w: 1 }
}
function rotation0(m: Matrix4): DOMPointInit {
  m.decompose(p, q, s)
  return { x: q.x, y: q.y, z: q.z, w: q.w }
}
