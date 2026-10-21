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
    async enterVR() {
      await requireStore().enterVR()
    },
    async enterAR() {
      await requireStore().enterAR()
    },
    async exit() {
      await session.value?.end()
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
