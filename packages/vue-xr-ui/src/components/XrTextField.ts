import { defineComponent, markRaw, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container, Input } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { activeTextTarget, type TextTarget } from '../runtime/text-target'

/**
 * A single-line text field: `<XrTextField v-model="name" placeholder="Your name" />`.
 *
 * Point at it or poke it to focus; the caret goes where you touched. Type
 * with an <XrKeyboard> (it types into the field focused last), or with a
 * physical keyboard on desktop. Enter emits `submit`.
 */
export const XrTextField = defineComponent({
  name: 'XrTextField',
  inheritAttrs: false,
  props: {
    modelValue: String,
    placeholder: String,
    disabled: Boolean,
    /** `password` shows dots instead of the text. */
    type: { type: String as PropType<'text' | 'password'>, default: 'text' },
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    submit: (_value: string) => true,
    focus: () => true,
    blur: () => true,
  },
  setup(props, { emit, expose }) {
    const theme = useXrTheme()
    const focused = ref(false)
    // Without v-model the field keeps its own value.
    const local = ref('')
    const current = () => props.modelValue ?? local.value
    const setValue = (value: string) => {
      local.value = value
      emit('update:modelValue', value)
    }

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const c = t.colors
        return {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          height: t.interaction.minTarget + t.space[2]!,
          paddingX: t.space[4],
          borderRadius: t.radius.md,
          borderWidth: 2,
          borderColor: focused.value ? c.primary : c.border,
          backgroundColor: props.disabled ? c.disabled : c.surfaceSunken,
          overflow: 'hidden',
          cursor: props.disabled ? 'not-allowed' : 'text',
          ...(props.disabled || focused.value ? {} : { hover: { borderColor: c.textMuted } }),
          // A press on the padding (not on the text) focuses at the end.
          onPointerDown: () => {
            if (props.disabled || input.hasFocus.peek()) return
            const end = current().length
            setTimeout(() => input.focus(end, end))
          },
          ...props.ui,
        }
      },
    )

    const inputProperties = () => {
      const t = theme.value
      const c = t.colors
      const style = t.typography.body
      return {
        value: current(),
        placeholder: props.placeholder,
        disabled: props.disabled,
        type: props.type,
        flexGrow: 1,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        color: props.disabled ? c.onDisabled : c.text,
        placeholderStyle: { color: c.textMuted },
        caretColor: c.primary,
        caretWidth: 2,
        selectionColor: c.focusRing,
        onValueChange: (value: string) => setValue(value),
        onFocusChange: (hasFocus: boolean) => {
          focused.value = hasFocus
          if (hasFocus) activeTextTarget.value = target
          if (hasFocus) emit('focus')
          else emit('blur')
        },
      }
    }
    const input = markRaw(new Input(inputProperties() as never))
    watch(inputProperties, (next) => input.resetProperties(next as never))
    node.add(input)

    /** Replaces the selection (or inserts at the caret) and keeps the caret after the new text. */
    const replace = (start: number, end: number, text: string) => {
      const value = current()
      const next = value.slice(0, start) + text + value.slice(end)
      const caret = start + text.length
      // Update the hidden <input> right away so the caret can be placed now;
      // the property update that follows sets the same value and leaves it.
      input.element.value = next
      setValue(next)
      input.focus(caret, caret)
    }
    const selection = (): [number, number] => {
      const length = current().length
      const start = Math.min(input.element.selectionStart ?? length, length)
      const end = Math.min(input.element.selectionEnd ?? start, length)
      return [start, end]
    }

    const target: TextTarget = {
      insert(text) {
        if (props.disabled) return
        const [start, end] = selection()
        replace(start, end, text)
      },
      deleteBackward() {
        if (props.disabled) return
        const [start, end] = selection()
        if (start !== end) return replace(start, end, '')
        if (start === 0) return input.focus(0, 0)
        // Don't split a surrogate pair (emoji).
        const code = current().charCodeAt(start - 1)
        const width = code >= 0xdc00 && code <= 0xdfff && start > 1 ? 2 : 1
        replace(start - width, start, '')
      },
      submit() {
        emit('submit', current())
      },
    }

    const onKeyDown = (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter') target.submit()
    }
    input.element.addEventListener('keydown', onKeyDown)

    onBeforeUnmount(() => {
      input.element.removeEventListener('keydown', onKeyDown)
      if (activeTextTarget.value === target) activeTextTarget.value = undefined
      input.dispose()
    })

    expose({
      focus: () => {
        const end = current().length
        input.focus(end, end)
      },
      blur: () => input.blur(),
    })

    return () => render()
  },
})
