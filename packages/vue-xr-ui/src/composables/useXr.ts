import { XR_CONTROLLER, type XrController } from '../runtime/context'
import { injectAppWide } from '../runtime/app-inject'

/** XR session state and actions. Works in DOM components and inside <TresCanvas>. */
export function useXr(): XrController {
  const controller = injectAppWide(XR_CONTROLLER)
  if (!controller) throw new Error('[vue-xr-ui] Install the plugin first: app.use(createXrUi()).')
  return controller
}
