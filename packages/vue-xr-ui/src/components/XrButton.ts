import { defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { slotText, useUikitNode } from '../runtime/node'
import { XrText } from './XrText'

export type XrButtonVariant = 'primary' | 'secondary' | 'ghost'
export type XrButtonSize = 'sm' | 'md' | 'lg'

/**
 * A pressable control. One `click` event for every input: mouse, controller
 * ray, hand pinch ray, and poking it with a fingertip.
 *
 * Sizes never go below the theme's `interaction.minTarget` (48 dmm by
 * default), the smallest target that is comfortable to hit in a headset.
 */
export const XrButton = defineComponent({
  name: 'XrButton',
  inheritAttrs: false,
  props: {
    variant: { type: String as PropType<XrButtonVariant>, default: 'primary' },
    size: { type: String as PropType<XrButtonSize>, default: 'md' },
    label: String,
    disabled: Boolean,
    /** Stretch to the parent's width. */
    block: Boolean,
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    click: (_event: unknown) => true,
  },
  setup(props, { slots, emit }) {
    const theme = useXrTheme()

    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const c = t.colors
        const height = { sm: t.interaction.minTarget, md: 56, lg: 64 }[props.size]
        const paddingX = { sm: t.space[4], md: t.space[5], lg: t.space[6] }[props.size]
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
          onClick: (event: unknown) => {
            if (!props.disabled) emit('click', event)
          },
          ...props.ui,
        }
      },
    )

    return () => {
      const text = props.label ?? slotText(slots)
      const children = text != null ? [h(XrText, { variant: 'label', text })] : slots.default?.()
      return render(children)
    }
  },
})
