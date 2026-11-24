import type { XrIconNode } from '../components/XrIcon'

// The few icons vue-xr-ui's own controls draw, copied from Lucide
// (https://lucide.dev, ISC licence) so the library needs no icon package.

export const CHECK_ICON: XrIconNode = [['path', { d: 'M20 6 9 17l-5-5' }]]
export const MINUS_ICON: XrIconNode = [['path', { d: 'M5 12h14' }]]
export const PLUS_ICON: XrIconNode = [
  ['path', { d: 'M5 12h14' }],
  ['path', { d: 'M12 5v14' }],
]
