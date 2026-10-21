import { ref, type Ref } from 'vue'
import { darkTheme, type ThemeTokens } from '@vue-xr-ui/tokens'
import { XR_THEME } from '../runtime/context'
import { injectAppWide } from '../runtime/app-inject'

const fallbackTheme = ref(darkTheme)

/** The active theme. Assign `.value` to switch themes at runtime. */
export function useXrTheme(): Ref<ThemeTokens> {
  return injectAppWide(XR_THEME) ?? fallbackTheme
}
