import { defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { slotText, useChildNode, useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { XrText } from './XrText'

/**
 * An on/off switch with an optional label: `<XrToggle v-model="sound">Sound</XrToggle>`.
 *
 * The whole row (switch and label) is the target, at least
 * `interaction.minTarget` tall, and reacts to the same inputs as XrButton.
 */
export const XrToggle = defineComponent({
  name: 'XrToggle',
  inheritAttrs: false,
  props: {
    modelValue: Boolean,
    label: String,
    disabled: Boolean,
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    'update:modelValue': (_value: boolean) => true,
    change: (_value: boolean, _event: ControlPointerEvent) => true,
  },
  setup(props, { slots, emit }) {
    const theme = useXrTheme()
    const press = usePress({
      disabled: () => props.disabled,
      onPress: (event) => {
        const next = !props.modelValue
        emit('update:modelValue', next)
        emit('change', next, event)
      },
    })

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          minHeight: t.interaction.minTarget,
          paddingX: t.space[1],
          borderRadius: t.radius.md,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...(props.disabled ? {} : { hover: { backgroundColor: t.colors.ghostHover } }),
          ...press,
          ...props.ui,
        }
      },
    )

    const trackWidth = 52
    const trackHeight = 32
    const inset = 4
    const track = useChildNode(node, () => {
      const c = theme.value.colors
      const on = props.modelValue
      return {
        width: trackWidth,
        height: trackHeight,
        flexShrink: 0,
        padding: inset,
        borderRadius: theme.value.radius.full,
        flexDirection: 'row',
        justifyContent: on ? 'flex-end' : 'flex-start',
        backgroundColor: props.disabled ? c.disabled : on ? c.primary : c.surfaceSunken,
        borderWidth: on ? 0 : 1,
        borderColor: c.border,
        // Sink back on press, like a button: the feedback for poke input.
        ...(props.disabled ? {} : { active: { transformTranslateZ: -theme.value.interaction.pressDepth } }),
      }
    })
    useChildNode(track, () => {
      const c = theme.value.colors
      const size = trackHeight - inset * 2 - (props.modelValue ? 0 : 2)
      return {
        width: size,
        height: size,
        borderRadius: theme.value.radius.full,
        backgroundColor: props.disabled ? c.onDisabled : props.modelValue ? c.onPrimary : c.textMuted,
      }
    })

    return () => {
      const text = props.label ?? slotText(slots)
      const children = text != null ? [h(XrText, { variant: 'label', text, muted: props.disabled })] : slots.default?.()
      return render(children)
    }
  },
})
