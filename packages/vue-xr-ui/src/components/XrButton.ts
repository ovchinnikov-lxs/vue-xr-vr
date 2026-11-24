import { defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { slotText, useUikitNode } from '../runtime/node'
import { usePress } from '../runtime/press'
import { XrIcon, type XrIconSource } from './XrIcon'
import { XrText } from './XrText'

export type XrButtonVariant = 'primary' | 'secondary' | 'ghost'
export type XrButtonSize = 'sm' | 'md' | 'lg'

/**
 * A pressable control. One `click` event for every input: mouse, controller
 * ray, hand pinch ray, and poking it with a fingertip.
 *
 * Sizes never go below the theme's `interaction.minTarget` (48 dmm by
 * default), the smallest target that is comfortable to hit in a headset.
 *
 * `icon` adds an XrIcon before the label; with no label it is an icon
 * button, round and as wide as it is tall:
 * `<XrButton :icon="Trash2" variant="ghost" name="delete" />`.
 */
export const XrButton = defineComponent({
  name: 'XrButton',
  inheritAttrs: false,
  props: {
    /** Colour role: `primary` (filled accent), `secondary` (filled neutral) or `ghost` (no background). */
    variant: { type: String as PropType<XrButtonVariant>, default: 'primary' },
    /** Height: `sm` (the theme's `minTarget`), `md` or `lg`. */
    size: { type: String as PropType<XrButtonSize>, default: 'md' },
    /** Text on the button. The default slot replaces it. */
    label: String,
    /** A Lucide icon node or an `<svg>` string (see XrIcon), drawn before the label, or alone. */
    icon: [Array, String] as PropType<XrIconSource>,
    /** Put the icon after the label instead of before it. */
    iconEnd: Boolean,
    /** Greys it out; it does not react to any input. */
    disabled: Boolean,
    /** Stretch to the parent's width. */
    block: Boolean,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** Pressed and released on it, with any input. */
    click: (_event: unknown) => true,
  },
  setup(props, { slots, emit }) {
    const theme = useXrTheme()
    const press = usePress({ disabled: () => props.disabled, onPress: (event) => emit('click', event) })

    const iconOnly = () => props.icon != null && props.label == null && !slots.default
    const iconSize = () => ({ sm: 20, md: 24, lg: 28 })[props.size]

    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const c = t.colors
        const height = { sm: t.interaction.minTarget, md: 56, lg: 64 }[props.size]
        // Icon only: a circle.
        const paddingX = iconOnly() ? 0 : { sm: t.space[4], md: t.space[5], lg: t.space[6] }[props.size]
        const palette = props.disabled
          ? { bg: c.disabled, hover: c.disabled, active: c.disabled, fg: c.onDisabled }
          : {
              primary: { bg: c.primary, hover: c.primaryHover, active: c.primaryActive, fg: c.onPrimary },
              secondary: { bg: c.secondary, hover: c.secondaryHover, active: c.secondaryActive, fg: c.onSecondary },
              ghost: { bg: 'rgba(0,0,0,0)', hover: c.ghostHover, active: c.ghostActive, fg: c.text },
            }[props.variant]

        return {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space[2],
          height,
          minWidth: height,
          ...(iconOnly() ? { width: height } : {}),
          paddingX,
          borderRadius: t.radius.full,
          backgroundColor: palette.bg,
          color: palette.fg,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...(props.block ? { alignSelf: 'stretch' } : {}),
          ...(props.disabled
            ? {}
            : {
                hover: { backgroundColor: palette.hover, transformScale: t.interaction.hoverScale },
                // Sink back on press: the main feedback for poke input, where
                // there is no cursor and no physical click.
                active: { backgroundColor: palette.active, transformTranslateZ: -t.interaction.pressDepth },
              }),
          ...press,
          ...props.ui,
        }
      },
    )

    return () => {
      const text = props.label ?? slotText(slots)
      const content = text != null ? [h(XrText, { variant: 'label', text })] : (slots.default?.() ?? [])
      if (props.icon == null) return render(content)
      const icon = h(XrIcon, { icon: props.icon, size: iconSize() })
      return render(props.iconEnd ? [...content, icon] : [icon, ...content])
    }
  },
})
