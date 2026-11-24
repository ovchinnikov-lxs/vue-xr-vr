import { defineComponent, type PropType } from 'vue'
import { Text } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { slotText, useUikitNode } from '../runtime/node'

type TextVariant = 'caption' | 'body' | 'label' | 'title' | 'headline'

/** Text in the theme's type scale. `<XrText variant="title">Hello</XrText>` */
export const XrText = defineComponent({
  name: 'XrText',
  inheritAttrs: false,
  props: {
    /** A step of the theme's type scale: `caption`, `body`, `label`, `title` or `headline`. */
    variant: { type: String as PropType<TextVariant>, default: 'body' },
    /** The text. The default slot (plain text) is used when it is left out. */
    text: [String, Number],
    /** Draw it in the theme's muted text colour. */
    muted: Boolean,
    /** Overrides the color inherited from the parent. */
    color: String,
    /** Horizontal alignment of the lines. */
    align: String as PropType<'left' | 'center' | 'right' | 'justify'>,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { slots }) {
    const theme = useXrTheme()
    // Slot text is not a reactive source the property getter can track, so
    // it is read during render (where Vue does track slot changes) and kept here.
    let slotValue = ''
    const { node, render } = useUikitNode(
      (initial) => new Text(initial),
      () => {
        const t = theme.value
        const style = t.typography[props.variant]
        return {
          text: props.text != null ? String(props.text) : slotValue,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          ...(props.muted ? { color: t.colors.textMuted } : {}),
          ...(props.color ? { color: props.color } : {}),
          ...(props.align ? { textAlign: props.align } : {}),
          ...props.ui,
        }
      },
    )
    return () => {
      if (props.text == null) {
        const text = slotText(slots) ?? ''
        if (text !== slotValue) {
          slotValue = text
          node.setProperties({ text })
        }
      }
      return render()
    }
  },
})
