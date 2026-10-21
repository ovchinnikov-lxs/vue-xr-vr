import { ref, type App, type Plugin } from 'vue'
import { darkTheme, type ThemeTokens } from '@vue-xr-ui/tokens'
import { XR_CONTROLLER, XR_THEME } from './runtime/context'
import { provideAppWide } from './runtime/app-inject'
import { createXrController } from './runtime/controller'

export interface XrUiOptions {
  theme?: ThemeTokens
}

/**
 * Installs the app-wide XR controller and theme.
 *
 * ```ts
 * createApp(App).use(createXrUi({ theme: darkTheme })).mount('#app')
 * ```
 */
export function createXrUi(options: XrUiOptions = {}): Plugin {
  return {
    install(app: App) {
      provideAppWide(app, XR_CONTROLLER, createXrController())
      provideAppWide(app, XR_THEME, ref(options.theme ?? darkTheme))
    },
  }
}
