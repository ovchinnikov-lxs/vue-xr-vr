import type { PropType } from 'vue'
import type { ThemeTokens } from '@vue-xr-ui/tokens'

/** Spacing is a step on the theme's scale (0..8) or an explicit "12px". */
export type SpaceValue = number | `${number}px`
export type Size = number | `${number}%` | 'auto'

/** Flex props shared by every container-like component. */
export const layoutProps = {
  direction: { type: String as PropType<'row' | 'column' | 'row-reverse' | 'column-reverse'>, default: 'column' },
  gap: [Number, String] as PropType<SpaceValue>,
  padding: [Number, String] as PropType<SpaceValue>,
  align: String as PropType<'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'>,
  justify: String as PropType<'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'>,
  wrap: Boolean,
  grow: Number,
  width: [Number, String] as PropType<Size>,
  height: [Number, String] as PropType<Size>,
  /** Escape hatch: raw @pmndrs/uikit properties, merged last. */
  ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
} as const

export interface LayoutPropValues {
  direction: string
  gap?: SpaceValue
  padding?: SpaceValue
  align?: string
  justify?: string
  wrap: boolean
  grow?: number
  width?: Size
  height?: Size
}

export function space(theme: ThemeTokens, value: SpaceValue | undefined): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return Number.parseFloat(value)
  return theme.space[value] ?? value
}

export function layoutToUikit(theme: ThemeTokens, p: LayoutPropValues): Record<string, unknown> {
  return dropUndefined({
    flexDirection: p.direction,
    gap: space(theme, p.gap),
    padding: space(theme, p.padding),
    alignItems: p.align,
    justifyContent: p.justify,
    flexWrap: p.wrap ? 'wrap' : undefined,
    flexGrow: p.grow,
    width: p.width,
    height: p.height,
  })
}

export function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) if (obj[key] === undefined) delete obj[key]
  return obj
}
