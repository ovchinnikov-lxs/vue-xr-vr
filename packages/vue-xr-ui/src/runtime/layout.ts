import type { PropType } from 'vue'
import type { ThemeTokens } from '@vue-xr-ui/tokens'

/** Spacing is a step on the theme's scale (0..8) or an explicit "12px". */
export type SpaceValue = number | `${number}px`
export type Size = number | `${number}%` | 'auto'

/** Flex props shared by every container-like component. */
export const layoutProps = {
  /** Main axis: children stacked (`column`) or side by side (`row`). */
  direction: { type: String as PropType<'row' | 'column' | 'row-reverse' | 'column-reverse'>, default: 'column' },
  /** Space between children: a step on the theme's spacing scale (0..8), or `"12px"` in dmm. */
  gap: [Number, String] as PropType<SpaceValue>,
  /** Space inside the edges: a spacing step, or `"12px"`. */
  padding: [Number, String] as PropType<SpaceValue>,
  /** Cross-axis alignment of the children (CSS `align-items`). */
  align: String as PropType<'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'>,
  /** Main-axis distribution of the children (CSS `justify-content`). */
  justify: String as PropType<'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'>,
  /** Wrap children onto more lines when they do not fit. */
  wrap: Boolean,
  /** Share of the parent's free space to take (CSS `flex-grow`). */
  grow: Number,
  /** Width in dmm, a percentage of the parent (`"50%"`), or `auto`. */
  width: [Number, String] as PropType<Size>,
  /** Height in dmm, a percentage of the parent, or `auto`. */
  height: [Number, String] as PropType<Size>,
  /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
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
