import { computed, defineComponent, h, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { MINUS_ICON, PLUS_ICON } from '../runtime/icons'
import { useUikitNode } from '../runtime/node'
import { usePress } from '../runtime/press'
import { XrButton } from './XrButton'
import { XrText } from './XrText'
import { XrTextField } from './XrTextField'

/** Holding − or + steps again after this long, then every REPEAT_MS. */
const HOLD_MS = 450
const REPEAT_MS = 90

const decimalsOf = (n: number) => {
  const s = String(n)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  return s.includes('.') ? s.split('.')[1]!.length : 0
}

/**
 * A number with − and + buttons and a field to type it in:
 * `<XrNumberInput v-model="guests" :min="1" :max="12" />`.
 *
 * − and + step by `step` on release; held, they keep stepping. The field
 * takes typing from XrKeyboard, a physical keyboard or the headset's system
 * keyboard; the value is parsed, clamped to `min`..`max` and rounded to
 * `precision` on Enter or when the field loses focus. Text that is not a
 * number puts the last value back.
 */
export const XrNumberInput = defineComponent({
  name: 'XrNumberInput',
  inheritAttrs: false,
  props: {
    /** The value. Use with `v-model`. */
    modelValue: Number,
    /** Smallest value; − is disabled there. */
    min: { type: Number, default: Number.NEGATIVE_INFINITY },
    /** Largest value; + is disabled there. */
    max: { type: Number, default: Number.POSITIVE_INFINITY },
    /** How much − and + change the value. */
    step: { type: Number, default: 1 },
    /** Decimals to keep. Defaults to the decimals of `step`. */
    precision: Number,
    /** Text after the field, such as a unit (`%`, `°C`). */
    suffix: String,
    /** Shown, muted, while there is no value. */
    placeholder: String,
    /** Greys it out; nothing reacts. */
    disabled: Boolean,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties for the row, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** A new value from −, + or the field (`v-model`). Always within `min`..`max`. */
    'update:modelValue': (_value: number) => true,
    /** Same as `update:modelValue`, only when the value differs from the current one. */
    change: (_value: number) => true,
  },
  setup(props, { emit }) {
    const theme = useXrTheme()
    const decimals = computed(() => props.precision ?? decimalsOf(props.step))
    const format = (value: number | undefined) => (value == null ? '' : value.toFixed(decimals.value))
    const clamp = (value: number) => {
      const rounded = Number(value.toFixed(decimals.value))
      return Math.min(props.max, Math.max(props.min, rounded))
    }

    // While the field is being edited it holds the typed text; otherwise it mirrors the value.
    const text = ref(format(props.modelValue))
    const editing = ref(false)
    watch(
      () => [props.modelValue, decimals.value] as const,
      () => {
        if (!editing.value) text.value = format(props.modelValue)
      },
    )

    // The value just emitted: several steps can run before the parent
    // passes it back down (a held button catching up after a slow frame).
    let latest: number | undefined
    watch(
      () => props.modelValue,
      () => (latest = undefined),
    )
    const set = (value: number) => {
      const next = clamp(value)
      text.value = format(next)
      if (next === (latest ?? props.modelValue)) return
      latest = next
      emit('update:modelValue', next)
      emit('change', next)
    }
    const start = () => latest ?? props.modelValue ?? (Number.isFinite(props.min) ? props.min : Number.isFinite(props.max) ? Math.min(0, props.max) : 0)
    const stepBy = (direction: 1 | -1) => {
      // Without a value, the first press lands on the start value itself.
      if (latest == null && props.modelValue == null) return set(start())
      set(start() + direction * props.step)
    }
    const commit = () => {
      const parsed = Number.parseFloat(text.value.replace(',', '.').replace(/\s/g, ''))
      if (Number.isNaN(parsed)) text.value = format(props.modelValue)
      else set(parsed)
    }

    const atMin = computed(() => props.modelValue != null && props.modelValue <= props.min)
    const atMax = computed(() => props.modelValue != null && props.modelValue >= props.max)
    // Not computed: `latest` is not reactive and moves within one tick.
    const blockedAt = (direction: 1 | -1) => {
      const value = latest ?? props.modelValue
      return value != null && (direction > 0 ? value >= props.max : value <= props.min)
    }

    /** − / +: step on release, or keep stepping while held. */
    const stepper = (direction: 1 | -1, blocked: () => boolean) => {
      let hold: ReturnType<typeof setTimeout> | undefined
      let repeated = false
      const stop = () => {
        clearTimeout(hold)
        clearInterval(hold)
        hold = undefined
        latest = undefined
      }
      onBeforeUnmount(stop)
      return usePress({
        disabled: () => props.disabled || blocked(),
        // Sliding off while held is not a hold: stop stepping.
        cancelAfter: 0.02,
        onDown: () => {
          repeated = false
          stop()
          const start = performance.now()
          let done = 0
          // Steps follow the clock, not the timer: a busy frame (a slow
          // headset frame delays timers) catches up instead of slowing down.
          const tick = () => {
            const due = Math.floor((performance.now() - start - HOLD_MS) / REPEAT_MS) + 1
            for (; done < due; done++) {
              if (props.disabled || blocked()) return stop()
              repeated = true
              stepBy(direction)
            }
          }
          hold = setTimeout(() => {
            tick()
            hold = setInterval(tick, REPEAT_MS)
          }, HOLD_MS)
        },
        onRelease: stop,
        onCancel: stop,
        onPress: () => {
          if (!repeated) stepBy(direction)
        },
      })
    }
    const minus = stepper(-1, () => blockedAt(-1))
    const plus = stepper(1, () => blockedAt(1))

    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: theme.value.space[2],
        flexShrink: 0,
        ...props.ui,
      }),
    )

    return () => {
      // XrButton's own press handlers are replaced by the stepper's through `ui`.
      const button = (name: string, icon: typeof PLUS_ICON, press: ReturnType<typeof stepper>, blocked: boolean) =>
        h(XrButton, { name, icon, variant: 'secondary', size: 'sm', disabled: props.disabled || blocked, ui: { ...press } })
      return render([
        button('decrement', MINUS_ICON, minus, atMin.value),
        h(XrTextField, {
          name: 'field',
          modelValue: text.value,
          placeholder: props.placeholder,
          disabled: props.disabled,
          ui: { flexGrow: 1, flexShrink: 1, minWidth: 64, alignSelf: 'auto' },
          'onUpdate:modelValue': (value: string) => (text.value = value),
          onFocus: () => (editing.value = true),
          onBlur: () => {
            editing.value = false
            commit()
          },
          onSubmit: commit,
        }),
        ...(props.suffix ? [h(XrText, { variant: 'label', text: props.suffix, muted: true })] : []),
        button('increment', PLUS_ICON, plus, atMax.value),
      ])
    }
  },
})
