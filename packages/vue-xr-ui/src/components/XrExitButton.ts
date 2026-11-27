import { computed, defineComponent, h, type PropType } from 'vue'
import { useXr } from '../composables/useXr'
import { XrButton, type XrButtonSize, type XrButtonVariant } from './XrButton'

/**
 * A button in the scene that ends the XR session: `<XrExitButton />`.
 * It shows only while a session runs (in the browser there is nothing to
 * exit), and reads "Exit VR" or "Exit AR" by itself.
 *
 * Every immersive app needs a way out that works with hands alone; the
 * system gestures differ between headsets and browsers. Put one where the
 * user always finds it: on the main window, or in an XrHandMenu.
 * XrSessionMenu adds a palm-pinch gesture that asks to exit.
 */
export const XrExitButton = defineComponent({
  name: 'XrExitButton',
  inheritAttrs: false,
  props: {
    /** Text on the button. Defaults to "Exit VR" or "Exit AR" for the running session. */
    label: String,
    /** Colour role, as on XrButton. */
    variant: { type: String as PropType<XrButtonVariant>, default: 'secondary' },
    /** Height, as on XrButton. */
    size: { type: String as PropType<XrButtonSize>, default: 'sm' },
    /** Stretch to the parent's width. */
    block: Boolean,
  },
  emits: {
    /** Pressed: the session is ending. */
    exit: () => true,
  },
  setup(props, { emit, attrs }) {
    const xr = useXr()
    const label = computed(() => props.label ?? (xr.mode.value === 'immersive-ar' ? 'Exit AR' : 'Exit VR'))
    const onClick = () => {
      emit('exit')
      void xr.exit()
    }
    return () =>
      xr.isPresenting.value
        ? h(XrButton, { ...attrs, variant: props.variant, size: props.size, block: props.block, label: label.value, onClick })
        : null
  },
})
