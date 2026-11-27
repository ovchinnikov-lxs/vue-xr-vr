import { defineComponent, markRaw, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container, Input } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { useXrFrame } from '../composables/useXrFrame'
import { useUikitNode } from '../runtime/node'
import { inTopModal } from '../runtime/modal'
import { activeTextTarget, type TextTarget } from '../runtime/text-target'
import { injectAppWide } from '../runtime/app-inject'
import { XR_CONTROLLER } from '../runtime/context'
import type { ControlPointerEvent } from '../runtime/press'

type Direction = 'forward' | 'backward' | 'none'
type FocusRequest = [start?: number, end?: number, direction?: Direction]

/**
 * uikit's Input, with its own focus requests (a press on the text) routed
 * through `gate`. uikit binds `this.focus` in its constructor, so an
 * override is the only way in. Our own calls use `focusNow`.
 */
class FieldInput extends Input {
  /** Returns true when it takes the request over (focuses later itself). */
  gate?: (...request: FocusRequest) => boolean
  override focus(start?: number, end?: number, direction?: Direction) {
    if (this.gate?.(start, end, direction)) return
    super.focus(start, end, direction)
  }
  focusNow(start?: number, end?: number, direction?: Direction) {
    super.focus(start, end, direction)
  }
}

/**
 * A single-line text field: `<XrTextField v-model="name" placeholder="Your name" />`.
 *
 * Point at it or poke it to focus; the caret goes where you touched. Type
 * with an <XrKeyboard> (it types into the field focused last), with a
 * physical keyboard on desktop, or with the headset's system keyboard
 * (Meta Quest Browser). Enter emits `submit`.
 */
export const XrTextField = defineComponent({
  name: 'XrTextField',
  inheritAttrs: false,
  props: {
    /** The text (`v-model`). Without it the field keeps its own text. */
    modelValue: String,
    /** Shown, muted, while the field is empty. */
    placeholder: String,
    /** Greys it out; it cannot take focus. */
    disabled: Boolean,
    /** `password` shows dots instead of the text. */
    type: { type: String as PropType<'text' | 'password'>, default: 'text' },
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** The text changed: typing, XrKeyboard, voice or the system keyboard (`v-model`). */
    'update:modelValue': (_value: string) => true,
    /** Enter was pressed, on any keyboard. */
    submit: (_value: string) => true,
    /** It took text focus. */
    focus: () => true,
    /** It lost text focus. */
    blur: () => true,
  },
  setup(props, { emit, expose }) {
    const theme = useXrTheme()
    const xr = injectAppWide(XR_CONTROLLER)
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
          onPointerDown: (event: ControlPointerEvent) => {
            if (props.disabled || !inTopModal(node)) return
            // Captured like any control: the release comes back here, never to
            // a select elsewhere (uikit captures a press on the text itself).
            if (event.pointerId != null) event.object?.setPointerCapture?.(event.pointerId)
            pressDown()
            if (input.hasFocus.peek()) return
            const end = current().length
            setTimeout(() => input.focus(end, end))
          },
          onPointerUp: pressUp,
          onPointerCancel: pressCancel,
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
        onPointerDown: pressDown,
        onPointerUp: pressUp,
        onPointerCancel: pressCancel,
        onValueChange: (value: string) => setValue(value),
        onFocusChange: (hasFocus: boolean) => {
          // Behind an open dialog (Tab, or a focus() call): give it straight back.
          if (hasFocus && !inTopModal(node)) {
            input.blur()
            return
          }
          const was = focused.value
          focused.value = hasFocus
          if (hasFocus) {
            activeTextTarget.value = target
            emit('focus')
          } else if (was) emit('blur')
        },
      }
    }
    // Quest's system keyboard opens when the field gets DOM focus. Focused on
    // the press (uikit's way), it popped up under a held trigger or pinch and
    // the release landed on it: no caret, nothing typed, and a field that
    // kept DOM focus never reopened it. So with a system keyboard, a press
    // focuses on its release, inside the session's `select` event when there
    // is one (as Meta's sample does: user activation), else on pointerup.
    let pressing = false
    let pending: FocusRequest | undefined
    const keyboardSession = () => (xr?.systemKeyboard.value ? xr.session.value : undefined)
    const flush = () => {
      const request = pending
      pending = undefined
      if (request && !props.disabled && inTopModal(node)) input.focusNow(...request)
    }
    function pressDown() {
      pressing = true
    }
    function pressUp() {
      pressing = false
      flush()
    }
    function pressCancel() {
      pressing = false
      pending = undefined
    }
    const gate = (...request: FocusRequest) => {
      const session = keyboardSession()
      if (!session) return false
      if (input.hasFocus.peek()) {
        // Focused but the keyboard is closed (the session is not blurred by
        // it): only a fresh focus opens it again.
        if (session.visibilityState !== 'visible') return false
        input.blur()
      }
      pending = request
      // A quick tap: the release came before uikit's deferred focus call.
      if (!pressing) flush()
      return true
    }

    const input = markRaw(new FieldInput(inputProperties() as never))
    input.gate = gate
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
      input.focusNow(caret, caret)
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
        if (start === 0) return input.focusNow(0, 0)
        // Don't split a surrogate pair (emoji).
        const code = current().charCodeAt(start - 1)
        const width = code >= 0xdc00 && code <= 0xdfff && start > 1 ? 2 : 1
        replace(start - width, start, '')
      },
      submit() {
        emit('submit', current())
      },
      textBeforeCaret() {
        return current().slice(0, selection()[0])
      },
      node,
      focus() {
        const end = current().length
        input.focusNow(end, end)
      },
      blur: () => input.blur(),
      focused: () => input.hasFocus.peek(),
    }

    // uikit reads the caret from the hidden <input> only on its input, key and
    // focus events. With Quest's system keyboard the caret stayed put while
    // the text grew past it: the selection evidently moves after the input
    // event, with no event of its own. Re-reading it every frame while focused catches any such order.
    // (focus() without a range on a focused input only re-reads the selection.)
    useXrFrame(() => {
      if (input.hasFocus.peek()) input.focusNow()
    })

    // The release of a controller trigger or a pinch: focus right inside the
    // event. Closing the keyboard (Done, or a press beside it) gives the
    // session back its focus: drop the field's, so the next tap reopens it.
    let session: XRSession | undefined
    let lastVisibility: XRVisibilityState | undefined
    // Only for a press on this field still held: a select elsewhere must not
    // pick up a request left behind.
    const onSelect = () => {
      if (pressing) flush()
    }
    const onVisibility = () => {
      const now = session?.visibilityState
      if (lastVisibility === 'visible-blurred' && now === 'visible' && input.hasFocus.peek()) input.blur()
      lastVisibility = now
    }
    const unwatchSession = watch(
      keyboardSession,
      (next) => {
        session?.removeEventListener('select', onSelect)
        session?.removeEventListener('visibilitychange', onVisibility)
        session = next
        lastVisibility = next?.visibilityState
        next?.addEventListener('select', onSelect)
        next?.addEventListener('visibilitychange', onVisibility)
      },
      { immediate: true },
    )

    const onKeyDown = (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter') target.submit()
    }
    input.element.addEventListener('keydown', onKeyDown)

    onBeforeUnmount(() => {
      unwatchSession()
      session?.removeEventListener('select', onSelect)
      session?.removeEventListener('visibilitychange', onVisibility)
      input.element.removeEventListener('keydown', onKeyDown)
      if (activeTextTarget.value === target) activeTextTarget.value = undefined
      input.dispose()
    })

    expose({ focus: target.focus, blur: target.blur })

    return () => render()
  },
})
