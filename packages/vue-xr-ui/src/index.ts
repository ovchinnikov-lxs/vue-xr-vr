// Make sure @pmndrs/pointer-events' type augmentation of three's
// Object3DEventMap is loaded before uikit's types.
import '@pmndrs/pointer-events'

export { createXrUi, type XrUiOptions } from './plugin'

export { XrScene } from './components/XrScene'
export { XrPanel } from './components/XrPanel'
export { XrBox } from './components/XrBox'
export { XrText } from './components/XrText'
export { XrButton, type XrButtonVariant, type XrButtonSize } from './components/XrButton'
export { XrWindow } from './components/XrWindow'
export { XrTabs, type XrTabOption } from './components/XrTabs'
export { XrList, XrListItem } from './components/XrList'
export { XrTooltip } from './components/XrTooltip'
export { XrToggle } from './components/XrToggle'
export { XrSlider } from './components/XrSlider'
export { XrTextField } from './components/XrTextField'
export { XrKeyboard, keyboardLayouts, type XrKeyboardLayout, type XrKeyboardKey } from './components/XrKeyboard'
export { XrThemeProvider } from './components/XrThemeProvider'
export { XrEnterButton } from './components/XrEnterButton'

export { useXr } from './composables/useXr'
export { useXrFrame } from './composables/useXrFrame'
export { useXrTheme } from './composables/useXrTheme'

export type { XrController, XrMode, FrameCallback } from './runtime/context'
export type { EmulatorOptions, EmulatedDevice, EmulatedRoom } from './runtime/emulator'
export * from '@vue-xr-ui/tokens'
