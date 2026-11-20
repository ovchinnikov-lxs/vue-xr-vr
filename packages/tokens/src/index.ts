/**
 * Design tokens for spatial UI.
 *
 * All lengths are in "dmm" (distance-independent millimetres): 1 dmm is 1 mm
 * seen from 1 m away. A panel placed twice as far is scaled twice as large,
 * so it keeps the same angular size. uikit lengths are pixels, so we map
 * 1px = 1dmm and set `pixelSize` from the panel distance (see `pixelSizeAt`).
 */

export type ColorToken = string

export interface ColorTokens {
  surface: ColorToken
  surfaceRaised: ColorToken
  surfaceSunken: ColorToken
  border: ColorToken
  text: ColorToken
  textMuted: ColorToken
  primary: ColorToken
  primaryHover: ColorToken
  primaryActive: ColorToken
  onPrimary: ColorToken
  secondary: ColorToken
  secondaryHover: ColorToken
  secondaryActive: ColorToken
  onSecondary: ColorToken
  ghostHover: ColorToken
  ghostActive: ColorToken
  danger: ColorToken
  focusRing: ColorToken
  disabled: ColorToken
  onDisabled: ColorToken
}

export interface TypeStyle {
  fontSize: number
  lineHeight: number
  fontWeight: 'normal' | 'medium' | 'semi-bold' | 'bold'
}

export interface ThemeTokens {
  name: string
  colors: ColorTokens
  /** Corner radii in dmm. */
  radius: { sm: number; md: number; lg: number; full: number }
  /** Spacing scale in dmm, index = step. */
  space: readonly number[]
  typography: { caption: TypeStyle; body: TypeStyle; label: TypeStyle; title: TypeStyle; headline: TypeStyle }
  /**
   * Interaction ergonomics. Targets smaller than `minTarget` are hard to hit
   * with a ray at arm's length and nearly impossible to poke with a finger.
   */
  interaction: {
    minTarget: number
    /** How far (dmm) a pressed control sinks back, gives feedback to poke input. */
    pressDepth: number
    hoverScale: number
  }
  /** Default distance (m) at which panels are designed to be read. */
  viewingDistance: number
}

const space = [0, 4, 8, 12, 16, 24, 32, 48, 64] as const

const typography: ThemeTokens['typography'] = {
  caption: { fontSize: 14, lineHeight: 1.4, fontWeight: 'normal' },
  body: { fontSize: 18, lineHeight: 1.45, fontWeight: 'normal' },
  label: { fontSize: 18, lineHeight: 1.2, fontWeight: 'medium' },
  title: { fontSize: 24, lineHeight: 1.25, fontWeight: 'semi-bold' },
  headline: { fontSize: 32, lineHeight: 1.2, fontWeight: 'bold' },
}

const radius = { sm: 8, md: 16, lg: 24, full: 999 }

const interaction = { minTarget: 48, pressDepth: 4, hoverScale: 1.03 }

export const darkTheme: ThemeTokens = {
  name: 'dark',
  colors: {
    surface: '#181a20',
    surfaceRaised: '#2a2d36',
    surfaceSunken: '#14161b',
    border: 'rgba(255, 255, 255, 0.12)',
    text: '#f2f4f8',
    textMuted: '#a3a9b8',
    primary: '#4f7cff',
    primaryHover: '#6a90ff',
    primaryActive: '#3a63e0',
    onPrimary: '#ffffff',
    secondary: '#353945',
    secondaryHover: '#424754',
    secondaryActive: '#2c2f39',
    onSecondary: '#f2f4f8',
    ghostHover: 'rgba(255, 255, 255, 0.08)',
    ghostActive: 'rgba(255, 255, 255, 0.14)',
    danger: '#ff5a5f',
    focusRing: '#9db5ff',
    disabled: '#2a2d36',
    onDisabled: '#6b7080',
  },
  radius,
  space,
  typography,
  interaction,
  viewingDistance: 1,
}

export const lightTheme: ThemeTokens = {
  ...darkTheme,
  name: 'light',
  colors: {
    surface: 'rgba(248, 249, 252, 0.94)',
    surfaceRaised: '#ffffff',
    surfaceSunken: '#e8ebf1',
    border: 'rgba(15, 20, 30, 0.12)',
    text: '#151820',
    textMuted: '#5b6272',
    primary: '#2f5ff0',
    primaryHover: '#4a74ff',
    primaryActive: '#244bc4',
    onPrimary: '#ffffff',
    secondary: '#e3e7ef',
    secondaryHover: '#d6dbe6',
    secondaryActive: '#c9cfdc',
    onSecondary: '#151820',
    ghostHover: 'rgba(15, 20, 30, 0.06)',
    ghostActive: 'rgba(15, 20, 30, 0.12)',
    danger: '#d93a40',
    focusRing: '#2f5ff0',
    disabled: '#e3e7ef',
    onDisabled: '#9aa1b0',
  },
}

/** World units (metres) per dmm for a panel `distance` metres away. */
export function pixelSizeAt(distance: number): number {
  return 0.001 * distance
}

/** Shallow-merge overrides into a theme, one level deep per group. */
export function defineTheme(base: ThemeTokens, overrides: DeepPartial<ThemeTokens> & { name: string }): ThemeTokens {
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...overrides.colors },
    radius: { ...base.radius, ...overrides.radius },
    typography: { ...base.typography, ...overrides.typography } as ThemeTokens['typography'],
    interaction: { ...base.interaction, ...overrides.interaction },
    space: (overrides.space as readonly number[] | undefined) ?? base.space,
  }
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

type Rgb = [number, number, number]

function parseHex(color: string): Rgb {
  const hex = color.trim().replace(/^#/, '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`[vue-xr-ui] Expected a hex color like #4f7cff, got "${color}".`)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

const toHex = (rgb: Rgb) => '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

/** Mixes `color` toward `target` by `amount` (0..1), in sRGB. */
function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return color.map((v, i) => v + (target[i]! - v) * amount) as Rgb
}

/** WCAG relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio of two hex colors, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(parseHex(a)), luminance(parseHex(b))].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/**
 * A theme with its accent colour replaced, derived from one hex value:
 * hover is a little lighter, pressed a little darker, the text on it is
 * white or near-black, and the focus ring is a
 * light tint on dark themes.
 *
 * ```ts
 * const theme = withAccent(darkTheme, '#22c55e')
 * ```
 */
export function withAccent(theme: ThemeTokens, accent: string): ThemeTokens {
  const base = parseHex(accent)
  const primary = toHex(base)
  // White unless it falls below 3:1 (the WCAG minimum for large text and UI):
  // white on a mid blue reads better to most people than its ratio suggests.
  const onPrimary = contrastRatio(primary, '#ffffff') >= 3 ? '#ffffff' : '#111318'
  const isDark = luminance(parseHex(theme.colors.text.startsWith('#') ? theme.colors.text : '#ffffff')) > 0.5
  return {
    ...theme,
    colors: {
      ...theme.colors,
      primary,
      primaryHover: toHex(mix(base, WHITE, 0.16)),
      primaryActive: toHex(mix(base, BLACK, 0.14)),
      onPrimary,
      focusRing: isDark ? toHex(mix(base, WHITE, 0.45)) : primary,
    },
  }
}
