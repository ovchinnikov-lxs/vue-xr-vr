import { computed, defineComponent, h, type PropType } from 'vue'
import { useXr } from '../composables/useXr'

/**
 * A regular DOM button that starts or ends an XR session. Put it next to
 * <TresCanvas>, not inside it. Styling is up to you (it renders a plain
 * <button> with class `xr-enter-button` and a `data-state` attribute).
 */
export const XrEnterButton = defineComponent({
  name: 'XrEnterButton',
  props: {
    /**
     * Which session it starts: `vr` (immersive), `ar` (passthrough, mixed
     * reality), or `auto`: passthrough where the device has it (Quest 3,
     * Quest Pro), else VR.
     */
    mode: { type: String as PropType<'vr' | 'ar' | 'auto'>, default: 'vr' },
  },
  setup(props, { slots }) {
    const xr = useXr()
    const resolved = computed<'vr' | 'ar'>(() => (props.mode === 'auto' ? (xr.supported.value.ar ? 'ar' : 'vr') : props.mode))
    const available = computed(() => (resolved.value === 'vr' ? xr.supported.value.vr : xr.supported.value.ar))
    const label = computed(() => {
      if (xr.isPresenting.value) return 'Exit'
      if (!available.value) return resolved.value === 'vr' ? 'VR not available' : 'AR not available'
      return resolved.value === 'vr' ? 'Enter VR' : 'Enter AR'
    })
    const onClick = () => {
      if (xr.isPresenting.value) return xr.exit()
      return resolved.value === 'vr' ? xr.enterVR() : xr.enterAR()
    }
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: 'xr-enter-button',
          'data-mode': resolved.value,
          'data-state': xr.isPresenting.value ? 'presenting' : available.value ? 'ready' : 'unavailable',
          disabled: !xr.isPresenting.value && !available.value,
          onClick,
        },
        slots.default?.({ label: label.value, presenting: xr.isPresenting.value, mode: resolved.value }) ?? label.value,
      )
  },
})
