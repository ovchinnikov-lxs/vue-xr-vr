import { defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { slotText, useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { space, type SpaceValue } from '../runtime/layout'
import { XrText } from './XrText'

/**
 * A vertical list that scrolls when its items do not fit in `maxHeight`.
 * Scroll by dragging it: with a controller or hand ray, a fingertip, or the
 * mouse (wheel too). Put `<XrListItem>`s inside.
 */
export const XrList = defineComponent({
  name: 'XrList',
  inheritAttrs: false,
  props: {
    /** Height (dmm) above which the list scrolls. */
    maxHeight: { type: Number, default: 240 },
    gap: { type: [Number, String] as PropType<SpaceValue>, default: 1 },
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { slots }) {
    const theme = useXrTheme()
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          flexDirection: 'column',
          alignSelf: 'stretch',
          flexShrink: 0,
          gap: space(t, props.gap),
          maxHeight: props.maxHeight,
          overflow: 'scroll',
          scrollbarWidth: 6,
          scrollbarColor: t.colors.textMuted,
          scrollbarOpacity: 0.5,
          scrollbarBorderRadius: 3,
          ...props.ui,
        }
      },
    )
    return () => render(slots.default?.())
  },
})

/**
 * A row in an XrList: a label, an optional description, and a selected
 * state. Emits `click` when tapped, not when the list is dragged from it.
 */
export const XrListItem = defineComponent({
  name: 'XrListItem',
  inheritAttrs: false,
  props: {
    label: String,
    description: String,
    selected: Boolean,
    disabled: Boolean,
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    click: (_event: ControlPointerEvent) => true,
  },
  setup(props, { slots, emit }) {
    const theme = useXrTheme()
    // 1 cm of travel turns a tap into a scroll.
    const press = usePress({ disabled: () => props.disabled, cancelAfter: 0.01, onPress: (e) => emit('click', e) })
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const c = t.colors
        return {
          flexDirection: 'column',
          justifyContent: 'center',
          flexShrink: 0,
          minHeight: t.interaction.minTarget,
          paddingX: t.space[4],
          paddingY: t.space[2],
          gap: t.space[1],
          borderRadius: t.radius.md,
          backgroundColor: props.selected ? c.secondary : 'rgba(0,0,0,0)',
          color: props.disabled ? c.onDisabled : c.text,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...(props.disabled
            ? {}
            : {
                hover: { backgroundColor: props.selected ? c.secondaryHover : c.ghostHover },
                active: { backgroundColor: c.ghostActive },
              }),
          ...press,
          ...props.ui,
        }
      },
    )
    return () => {
      const label = props.label ?? slotText(slots)
      const children =
        label != null
          ? [
              h(XrText, { variant: 'label', text: label }),
              ...(props.description ? [h(XrText, { variant: 'caption', muted: true, text: props.description })] : []),
            ]
          : slots.default?.()
      return render(children)
    }
  },
})
