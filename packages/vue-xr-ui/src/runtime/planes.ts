import { markRaw, shallowRef, type ShallowRef } from 'vue'
import { Matrix4, Vector2, Vector3 } from 'three'
import type { XRStore } from './context'
import { spaceToWorld } from './xr-pose'

/** A real surface the headset found: a wall, the floor, a table... (WebXR plane detection). */
export interface XrPlane {
  /** The WebXR plane object. */
  readonly plane: XRPlane
  /**
   * What it is, from the room setup on the headset, in lower case: `wall`,
   * `floor`, `ceiling`, `table`, `couch`, `door frame`, `window frame`,
   * `other`... Empty when the device does not say.
   */
  readonly label: string
  readonly orientation: 'horizontal' | 'vertical'
  /** Plane space to world. The plane lies in its local x/z; local +y is its normal. Updated every frame. */
  readonly matrix: Matrix4
  /** The plane's outline in its local x/z, metres. */
  readonly polygon: readonly Vector2[]
  /** Bounds of the outline in local x/z. */
  readonly min: Vector2
  readonly max: Vector2
  /** World centre of the bounds. Updated every frame. */
  readonly center: Vector3
  /** World normal (local +y). Updated every frame. */
  readonly normal: Vector3
  /** Tracked this frame. */
  readonly tracked: boolean
}

type MutablePlane = { -readonly [K in keyof XrPlane]: XrPlane[K] } & { changed: number }

export interface PlaneTracker {
  planes: ShallowRef<readonly XrPlane[]>
  /** Called every frame by <XrScene>. Does nothing until someone uses planes. */
  update(frame: XRFrame | undefined): void
  /** Counts a user; returns the release. */
  use(): () => void
}

const center2 = new Vector2()

export function createPlaneTracker(store: XRStore): PlaneTracker {
  const planes = shallowRef<readonly XrPlane[]>([])
  const byPlane = new Map<XRPlane, MutablePlane>()
  let users = 0
  const clear = () => {
    byPlane.clear()
    if (planes.value.length) planes.value = []
  }
  return {
    planes,
    use() {
      users++
      return () => {
        users--
        if (users === 0) clear()
      }
    },
    update(frame) {
      if (users === 0) return
      // In a session, three.js also ticks from window rAF without an XRFrame
      // (desktop Chrome, the emulator): keep the last poses for those.
      if (!frame && store.getState().session) return
      const detected = frame ? store.getState().detectedPlanes : []
      let listChanged = detected.length !== byPlane.size
      for (const plane of detected) {
        let entry = byPlane.get(plane)
        if (!entry) {
          entry = markRaw({
            plane,
            label: (plane.semanticLabel ?? '').toLowerCase(),
            orientation: plane.orientation === 'vertical' ? 'vertical' : 'horizontal',
            matrix: new Matrix4(),
            polygon: [],
            min: new Vector2(),
            max: new Vector2(),
            center: new Vector3(),
            normal: new Vector3(),
            tracked: false,
            changed: -1,
          }) as MutablePlane
          byPlane.set(plane, entry)
          listChanged = true
        }
        if (entry.changed !== plane.lastChangedTime) {
          entry.changed = plane.lastChangedTime
          entry.polygon = plane.polygon.map((p) => new Vector2(p.x, p.z))
          entry.min.set(Infinity, Infinity)
          entry.max.set(-Infinity, -Infinity)
          for (const p of entry.polygon) {
            entry.min.min(p)
            entry.max.max(p)
          }
        }
        entry.tracked = spaceToWorld(store, frame!, plane.planeSpace, entry.matrix)
        if (entry.tracked) {
          center2.addVectors(entry.min, entry.max).multiplyScalar(0.5)
          entry.center.set(center2.x, 0, center2.y).applyMatrix4(entry.matrix)
          entry.normal.set(0, 1, 0).transformDirection(entry.matrix)
        }
      }
      if (listChanged) {
        const live = new Set(detected)
        for (const plane of [...byPlane.keys()]) if (!live.has(plane)) byPlane.delete(plane)
        planes.value = [...byPlane.values()]
      }
    },
  }
}

/** Which planes a snapping panel sticks to. `true`: walls and tables. */
export type XrSnapTarget = boolean | readonly string[]

const local = new Vector3()
const inverse = new Matrix4()
const up = new Vector3(0, 1, 0)

export interface SnapResult {
  plane: XrPlane
  position: Vector3
  /** Rotation around the vertical axis, so the panel faces out of a wall or toward the viewer on a table. */
  yaw: number
}

function matches(plane: XrPlane, target: XrSnapTarget): boolean {
  if (target === false || !plane.tracked) return false
  if (target === true) return plane.label === 'wall' || plane.label === 'table' || (plane.label === '' && plane.orientation === 'vertical')
  return target.includes(plane.label)
}

/**
 * Where a panel being carried to `point` (world) would stick, if a matching
 * plane is within `distance` metres: flat against a wall (a hair in front of
 * it, facing into the room), or standing on a table with its bottom edge
 * (`halfHeight` below its centre) on the surface, facing the viewer.
 */
export function snapToPlanes(
  point: Vector3,
  planes: readonly XrPlane[],
  target: XrSnapTarget,
  distance: number,
  halfHeight: number,
  head: Vector3,
): SnapResult | undefined {
  let best: SnapResult | undefined
  let bestDistance = distance
  for (const plane of planes) {
    if (!matches(plane, target)) continue
    inverse.copy(plane.matrix).invert()
    local.copy(point).applyMatrix4(inverse)
    if (local.x < plane.min.x || local.x > plane.max.x || local.z < plane.min.y || local.z > plane.max.y) continue
    if (plane.orientation === 'vertical') {
      const d = Math.abs(local.y)
      if (d > bestDistance) continue
      // Face into the room: the side of the wall the viewer is on.
      const normal = plane.normal.clone()
      if (normal.dot(local.copy(head).sub(plane.center)) < 0) normal.negate()
      // Strip any tilt: walls are vertical, panels stay upright.
      normal.y = 0
      if (normal.lengthSq() < 1e-6) continue
      normal.normalize()
      const onWall = point.clone().addScaledVector(plane.normal, -plane.normal.dot(local.copy(point).sub(plane.center)))
      bestDistance = d
      best = { plane, position: onWall.addScaledVector(normal, 0.01), yaw: Math.atan2(normal.x, normal.z) }
    } else {
      // Only surfaces facing up, and only from above or a little below.
      if (plane.normal.dot(up) < 0.9) continue
      const surface = plane.center.y
      const d = Math.abs(point.y - halfHeight - surface)
      if (d > bestDistance) continue
      bestDistance = d
      best = {
        plane,
        position: new Vector3(point.x, surface + halfHeight, point.z),
        yaw: Math.atan2(head.x - point.x, head.z - point.z),
      }
    }
  }
  return best
}
