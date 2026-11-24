import { computed, defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { space, type SpaceValue } from '../runtime/layout'
import { XrBox } from './XrBox'
import { XrText } from './XrText'

/** What an XrRadioGroup's `v-model` holds: the chosen option's `value`. */
export type XrRadioValue = string | number

/** One choice of an XrRadioGroup. A plain string is both its label and its value. */
export interface XrRadioOption {
  /** Text next to the circle. */
  label: string
  /** Written to `v-model` when chosen; unique within the options. */
  value: XrRadioValue
  /** A second, muted line under the label. */
  description?: string
  /** Shown greyed out; cannot be chosen. */
  disabled?: boolean
}

const normalize = (option: string | XrRadioOption): XrRadioOption =>
  typeof option === 'string' ? { label: option, value: option } : option

/** Side of the circle, in dmm. */
const CIRCLE = 28

/** One row of the group: circle, label, description. Not public: the group owns the choice. */
const RadioOption = defineComponent({
  name: 'XrRadioOption',
  inheritAttrs: false,
  props: {
    option: { type: Object as PropType<XrRadioOption>, required: true },
    checked: Boolean,
    disabled: Boolean,
  },
  // An array: scripts/api.mjs reads event docs from the first emits object in the file.
  emits: ['choose'],
  setup(props, { emit }) {
    const theme = useXrTheme()
    const press = usePress({ disabled: () => props.disabled, onPress: (event) => emit('choose', event) })
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          minHeight: t.interaction.minTarget,
          paddingX: t.space[1],
          paddingY: t.space[1],
          borderRadius: t.radius.md,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...(props.disabled ? {} : { hover: { backgroundColor: t.colors.ghostHover } }),
          ...press,
        }
      },
    )
    return () => {
      const t = theme.value
      const c = t.colors
      const circle = h(
        XrBox,
        {
          name: 'circle',
          align: 'center',
          justify: 'center',
          ui: {
            width: CIRCLE,
            height: CIRCLE,
            flexShrink: 0,
            borderRadius: t.radius.full,
            borderWidth: 2,
            borderColor: props.disabled ? c.onDisabled : props.checked ? c.primary : c.textMuted,
            backgroundColor: props.disabled ? c.disabled : c.surfaceSunken,
            ...(props.disabled ? {} : { active: { transformTranslateZ: -t.interaction.pressDepth } }),
          },
        },
        () =>
          props.checked
            ? [h(XrBox, { name: 'dot', ui: { width: 14, height: 14, borderRadius: t.radius.full, backgroundColor: props.disabled ? c.onDisabled : c.primary } })]
            : [],
      )
      const text = props.option.description
        ? h(XrBox, { gap: 1, ui: { flexShrink: 1 } }, () => [
            h(XrText, { variant: 'label', text: props.option.label, muted: props.disabled }),
            h(XrText, { variant: 'caption', text: props.option.description, muted: true }),
          ])
        : h(XrText, { variant: 'label', text: props.option.label, muted: props.disabled })
      return render([circle, text])
    }
  },
})

/**
 * A set of options of which exactly one is chosen, shown all at once (for a
 * long list, use XrSelect).
 *
 * ```vue
 * <XrRadioGroup v-model="size" :options="['Small', 'Medium', 'Large']" />
 * <XrRadioGroup v-model="plan" :options="[{ label: 'Free', value: 'free', description: '1 room' }, { label: 'Pro', value: 'pro' }]" />
 * ```
 *
 * Every row (circle and label) is a target at least `interaction.minTarget`
 * tall, and reacts to every input like XrButton.
 */
export const XrRadioGroup = defineComponent({
  name: 'XrRadioGroup',
  inheritAttrs: false,
  props: {
    /** The chosen option's value. Use with `v-model`. */
    modelValue: [String, Number] as PropType<XrRadioValue>,
    /** The choices: strings, or `{ label, value, description?, disabled? }`. */
    options: { type: Array as PropType<ReadonlyArray<string | XrRadioOption>>, default: () => [] },
    /** Stack the options (`column`) or put them side by side (`row`). */
    direction: { type: String as PropType<'column' | 'row'>, default: 'column' },
    /** Space between the options: a step on the theme's scale, or `"12px"`. */
    gap: { type: [Number, String] as PropType<SpaceValue>, default: 1 },
    /** Greys out every option; none can be chosen. */
    disabled: Boolean,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties for the group, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** An option was chosen (`v-model`). */
    'update:modelValue': (_value: XrRadioValue) => true,
    /** An option other than the current one was chosen. */
    change: (_value: XrRadioValue, _option: XrRadioOption) => true,
  },
  setup(props, { emit }) {
    const theme = useXrTheme()
    const options = computed(() => props.options.map(normalize))
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({
        flexDirection: props.direction,
        flexWrap: props.direction === 'row' ? 'wrap' : 'no-wrap',
        gap: space(theme.value, props.gap),
        flexShrink: 0,
        ...props.ui,
      }),
    )
    const choose = (option: XrRadioOption) => {
      if (option.value === props.modelValue) return
      emit('update:modelValue', option.value)
      emit('change', option.value, option)
    }
    return () =>
      render(
        options.value.map((option) =>
          h(RadioOption, {
            key: `${typeof option.value}:${option.value}`,
            option,
            checked: option.value === props.modelValue,
            disabled: props.disabled || option.disabled,
            onChoose: () => choose(option),
          }),
        ),
      )
  },
})
