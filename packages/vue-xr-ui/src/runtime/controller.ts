import { computed, ref, shallowRef } from 'vue'
import type { XRStore, XrController, XrMode } from './context'

export interface InternalXrController extends XrController {
  /** Called by <XrScene> once the three.js renderer exists. */
  attach(store: XRStore): () => void
}

export function createXrController(): InternalXrController {
  const store = shallowRef<XRStore>()
  const session = shallowRef<XRSession>()
  const mode = ref<XrMode | null>(null)
  const supported = ref({ vr: false, ar: false })
  const ending = new WeakSet<XRSession>()

  if (typeof navigator !== 'undefined' && navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((vr) => (supported.value.vr = vr), () => {})
    navigator.xr.isSessionSupported('immersive-ar').then((ar) => (supported.value.ar = ar), () => {})
  }

  const requireStore = () => {
    if (!store.value) throw new Error('[vue-xr-ui] No <XrScene> is mounted inside <TresCanvas>.')
    return store.value
  }

  return {
    store,
    session,
    mode,
    supported,
    isPresenting: computed(() => session.value != null),
    // Not in the WebXR typings: a Chromium attribute that only Quest Browser sets to true.
    systemKeyboard: computed(() => Boolean((session.value as { isSystemKeyboardSupported?: boolean } | undefined)?.isSystemKeyboardSupported)),
    async enterVR() {
      await requireStore().enterVR()
    },
    async enterAR() {
      await requireStore().enterAR()
    },
    async exit() {
      const current = session.value
      if (!current || ending.has(current)) return
      ending.add(current)
      // Called from a button in the scene, this runs inside @pmndrs/xr's
      // pointer dispatch; ending the session tears its pointers down mid-way.
      // Let the current frame finish first.
      await new Promise((resolve) => setTimeout(resolve))
      // A double press, or the session ended on its own meanwhile: once is enough.
      await current.end().catch(() => {})
    },
    attach(next) {
      store.value = next
      const sync = () => {
        const state = next.getState()
        session.value = state.session
        mode.value = (state.mode as XrMode | null) ?? null
        // The emulator is injected asynchronously, so re-check support once it lands.
        if (state.emulator) supported.value = { vr: true, ar: true }
      }
      sync()
      const unsubscribe = next.subscribe(sync)
      return () => {
        unsubscribe()
        if (store.value === next) {
          store.value = undefined
          session.value = undefined
          mode.value = null
        }
      }
    },
  }
}
