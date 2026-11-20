import { computed, defineComponent, provide, type PropType, type Ref } from 'vue'
import { withAccent, type ThemeTokens } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { XR_THEME } from '../runtime/context'

/**
 * Gives everything inside it its own theme, like a CSS custom property set
 * on one element: a red "danger zone" card, a light panel in a dark scene.
 *
 * ```vue
 * <XrThemeProvider accent="#22c55e">
 *   <XrButton>Confirm</XrButton>
 * </XrThemeProvider>
 * ```
 *
 * `theme` replaces the inherited theme, `accent` derives the primary colours
 * from one hex value (see `withAccent`). Both together: that theme with that
 * accent. It renders nothing itself, so it can wrap a whole window or a
 * single button.
 */
export const XrThemeProvider = defineComponent({
  name: 'XrThemeProvider',
  props: {
    theme: Object as PropType<ThemeTokens>,
    accent: String,
  },
  setup(props, { slots }) {
    const parent = useXrTheme()
    const theme = computed(() => {
      const base = props.theme ?? parent.value
      return props.accent ? withAccent(base, props.accent) : base
    })
    // Read-only below this point: switching the app theme is done on the app-wide ref.
    provide(XR_THEME, theme as unknown as Ref<ThemeTokens>)
    return () => slots.default?.()
  },
})
