import { defineComponent, h, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { usePress } from '../runtime/press'
import { XrText } from './XrText'

export type XrTabOption = string | { value: string; label: string; disabled?: boolean }

/**
 * A row of tabs (a segmented control): `<XrTabs v-model="tab" :tabs="['Controls', 'List']" />`.
 *
 * It only switches the value; show the matching content yourself
 * (`<XrBox v-if="tab === 'List'">`). Each tab is a full-size target.
 */
export const XrTabs = defineComponent({
  name: 'XrTabs',
  inheritAttrs: false,
  props: {
    modelValue: String,
    tabs: { type: Array as PropType<XrTabOption[]>, required: true },
    /** Stretch to the parent's width, tabs sharing it equally. */
    block: Boolean,
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    change: (_value: string) => true,
  },
  setup(props, { emit }) {
    const theme = useXrTheme()
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          flexDirection: 'row',
          gap: t.space[1],
          padding: t.space[1],
          borderRadius: t.radius.full,
          backgroundColor: t.colors.surfaceSunken,
          borderWidth: 1,
          borderColor: t.colors.border,
          ...(props.block ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }),
          ...props.ui,
        }
      },
    )
    const select = (value: string) => {
      if (value === props.modelValue) return
      emit('update:modelValue', value)
      emit('change', value)
    }
    return () =>
      render(
        props.tabs.map((tab) => {
          const option = typeof tab === 'string' ? { value: tab, label: tab } : tab
          return h(XrTab, {
            key: option.value,
            label: option.label,
            selected: option.value === props.modelValue,
            disabled: !!option.disabled,
            grow: props.block,
            onSelect: () => select(option.value),
          })
        }),
      )
  },
})

const XrTab = defineComponent({
  name: 'XrTab',
  props: {
    label: { type: String, required: true },
    selected: Boolean,
    disabled: Boolean,
    grow: Boolean,
    onSelect: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const theme = useXrTheme()
    const press = usePress({ disabled: () => props.disabled, onPress: () => props.onSelect() })
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const c = t.colors
        return {
          height: t.interaction.minTarget - t.space[1]! * 2,
          minWidth: t.interaction.minTarget,
          paddingX: t.space[4],
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radius.full,
          ...(props.grow ? { flexGrow: 1, flexBasis: 0 } : {}),
          backgroundColor: props.selected ? c.primary : 'rgba(0,0,0,0)',
          color: props.disabled ? c.onDisabled : props.selected ? c.onPrimary : c.text,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...(props.disabled || props.selected
            ? {}
            : {
                hover: { backgroundColor: c.ghostHover },
                active: { backgroundColor: c.ghostActive, transformTranslateZ: -t.interaction.pressDepth },
              }),
          ...press,
        }
      },
    )
    return () => render([h(XrText, { variant: 'label', text: props.label })])
  },
})
