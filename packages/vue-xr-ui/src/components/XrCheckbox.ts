import { defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { CHECK_ICON } from '../runtime/icons'
import { slotText, useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { XrBox } from './XrBox'
import { XrIcon } from './XrIcon'
import { XrText } from './XrText'

/** Side of the box, in dmm. */
const BOX = 28

/**
 * A checkbox with an optional label: `<XrCheckbox v-model="agree">I agree</XrCheckbox>`.
 *
 * The whole row (box and label) is the target, at least
 * `interaction.minTarget` tall, and reacts to every input like XrButton.
 * `indeterminate` shows a dash (a "some selected" parent); a press then
 * checks it.
 */
export const XrCheckbox = defineComponent({
  name: 'XrCheckbox',
  inheritAttrs: false,
  props: {
    /** Checked or not. Use with `v-model`. */
    modelValue: Boolean,
    /** Shows a dash instead of the check mark, whatever `modelValue` is. Clear it yourself on `change`. */
    indeterminate: Boolean,
    /** Text next to the box. The default slot replaces it. */
    label: String,
    /** Greys it out; it does not react to any input. */
    disabled: Boolean,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties for the row, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** The new state after a press (`v-model`). */
    'update:modelValue': (_value: boolean) => true,
    /** Pressed: the new state and the pointer event. */
    change: (_value: boolean, _event: ControlPointerEvent) => true,
  },
  setup(props, { slots, emit }) {
    const theme = useXrTheme()
    const press = usePress({
      disabled: () => props.disabled,
      onPress: (event) => {
        // A press on a dash checks it, like the DOM.
        const next = props.indeterminate ? true : !props.modelValue
        emit('update:modelValue', next)
        emit('change', next, event)
      },
    })

    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          // A box with no label is still a full-size target.
          minHeight: t.interaction.minTarget,
          minWidth: t.interaction.minTarget,
          paddingX: t.space[1],
          borderRadius: t.radius.md,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...(props.disabled ? {} : { hover: { backgroundColor: t.colors.ghostHover } }),
          ...press,
          ...props.ui,
        }
      },
    )

    return () => {
      const t = theme.value
      const c = t.colors
      const filled = props.modelValue || props.indeterminate
      const mark = props.indeterminate
        ? h(XrBox, { name: 'mark', ui: { width: 14, height: 3, borderRadius: 2, backgroundColor: props.disabled ? c.onDisabled : c.onPrimary } })
        : props.modelValue
          ? h(XrIcon, { name: 'mark', icon: CHECK_ICON, size: 20, strokeWidth: 3, color: props.disabled ? c.onDisabled : c.onPrimary })
          : null
      const box = h(
        XrBox,
        {
          name: 'box',
          align: 'center',
          justify: 'center',
          ui: {
            width: BOX,
            height: BOX,
            flexShrink: 0,
            borderRadius: t.radius.sm,
            borderWidth: filled ? 0 : 2,
            borderColor: props.disabled ? c.onDisabled : c.textMuted,
            backgroundColor: props.disabled ? c.disabled : filled ? c.primary : c.surfaceSunken,
            // Sink back on press: the feedback for a poke.
            ...(props.disabled ? {} : { active: { transformTranslateZ: -t.interaction.pressDepth } }),
          },
        },
        () => (mark ? [mark] : []),
      )
      const text = props.label ?? slotText(slots)
      const label = text != null ? [h(XrText, { variant: 'label', text, muted: props.disabled })] : (slots.default?.() ?? [])
      return render([box, ...label])
    }
  },
})
