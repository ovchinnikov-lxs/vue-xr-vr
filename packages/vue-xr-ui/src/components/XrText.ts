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
    variant: { type: String as PropType<TextVariant>, default: 'body' },
    text: [String, Number],
    muted: Boolean,
    /** Overrides the color inherited from the parent. */
    color: String,
    align: String as PropType<'left' | 'center' | 'right' | 'justify'>,
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
