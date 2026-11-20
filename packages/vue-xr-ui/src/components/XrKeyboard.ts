import { computed, defineComponent, h, onBeforeUnmount, ref, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { usePress } from '../runtime/press'
import { activeTextTarget } from '../runtime/text-target'
import { XrText } from './XrText'

/**
 * A keyboard layout: three rows of letters. Digits, Shift, Backspace, the
 * layout switch, space, punctuation and Enter are added around them.
 */
export interface XrKeyboardLayout {
  /** Shown on the layout switch key, e.g. "EN". */
  label: string
  rows: [string, string, string]
}

export const keyboardLayouts = {
  en: { label: 'EN', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
  ru: { label: 'RU', rows: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'] },
} satisfies Record<string, XrKeyboardLayout>

/** What a key press sends: a character, or one of the named keys. */
export type XrKeyboardKey = string | 'Backspace' | 'Enter'

type Shift = 'off' | 'once' | 'lock'
type Key =
  | { kind: 'char'; char: string; width: number }
  | { kind: 'shift' | 'backspace' | 'enter' | 'layout' | 'space'; width: number }

/** Two Shift taps closer than this lock capitals on. */
const DOUBLE_TAP_MS = 400
/** Holding Backspace repeats after this long, then every REPEAT_MS. */
const REPEAT_DELAY_MS = 450
const REPEAT_MS = 70

/**
 * An on-screen keyboard sized for rays and fingertips.
 *
 * - `<XrKeyboard v-model="text" />` edits that string (at its end).
 * - Without v-model it types into the <XrTextField> focused last, at its caret.
 *
 * It also emits `key` for every press and `enter` on Enter. Shift is one
 * capital; tap it twice quickly for caps lock. Holding Backspace repeats.
 * The layout key cycles through `layouts` (English and Russian by default).
 *
 * Inside a panel or window it is a borderless block; on its own at the top
 * level of the scene it is a floating keyboard with its own background.
 */
export const XrKeyboard = defineComponent({
  name: 'XrKeyboard',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined },
    /** Layout names from `keyboardLayouts`, or your own layouts. */
    layouts: {
      type: Array as PropType<Array<keyof typeof keyboardLayouts | XrKeyboardLayout>>,
      default: () => ['en', 'ru'],
    },
    /** Index into `layouts` of the active layout (v-model:layout). Uncontrolled if left out. */
    layout: Number,
    /** Width and height of one letter key in dmm. Defaults to the theme's minimum target. */
    keySize: Number,
    /** Label of the Enter key. */
    enterLabel: { type: String, default: '↵' },
    /** Only for a root keyboard: reading distance in metres. */
    distance: Number,
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    'update:layout': (_index: number) => true,
    key: (_key: XrKeyboardKey) => true,
    enter: () => true,
  },
  setup(props, { emit }) {
    const theme = useXrTheme()
    const shift = ref<Shift>('off')
    let lastShiftTap = 0
    const localLayout = ref(0)

    const layouts = computed(() =>
      props.layouts.map((l) => (typeof l === 'string' ? keyboardLayouts[l] : l)),
    )
    const layoutIndex = computed(() => (props.layout ?? localLayout.value) % Math.max(1, layouts.value.length))
    const layout = computed(() => layouts.value[layoutIndex.value] ?? keyboardLayouts.en)
    /** Every row is this many key units wide, so switching layouts keeps the keyboard's size. */
    const columns = computed(() => Math.max(10, ...layouts.value.flatMap((l) => l.rows.map((r) => [...r].length))))

    const rows = computed<Key[][]>(() => {
      const chars = (row: string): Key[] => [...row].map((char) => ({ kind: 'char', char, width: 1 }))
      const [top, middle, bottom] = layout.value.rows
      const side = (columns.value - [...bottom].length) / 2
      return [
        chars('1234567890'),
        chars(top),
        chars(middle),
        [{ kind: 'shift', width: side }, ...chars(bottom), { kind: 'backspace', width: side }],
        [
          { kind: 'layout', width: 1.5 },
          { kind: 'char', char: ',', width: 1 },
          { kind: 'space', width: columns.value - 6 },
          { kind: 'char', char: '.', width: 1 },
          { kind: 'enter', width: 2.5 },
        ],
      ]
    })

    const send = (key: XrKeyboardKey) => {
      emit('key', key)
      const target = activeTextTarget.value
      if (props.modelValue !== undefined) {
        const value = props.modelValue
        if (key === 'Backspace') emit('update:modelValue', [...value].slice(0, -1).join(''))
        else if (key !== 'Enter') emit('update:modelValue', value + key)
      } else if (target) {
        if (key === 'Backspace') target.deleteBackward()
        else if (key === 'Enter') target.submit()
        else target.insert(key)
      }
      if (key === 'Enter') emit('enter')
    }

    const press = (key: Key) => {
      switch (key.kind) {
        case 'char': {
          const upper = shift.value !== 'off'
          send(upper ? key.char.toUpperCase() : key.char)
          if (shift.value === 'once') shift.value = 'off'
          break
        }
        case 'space':
          send(' ')
          break
        case 'enter':
          send('Enter')
          break
        case 'backspace':
          // Sent on down (and repeated), see XrKey.
          break
        case 'shift': {
          const now = performance.now()
          shift.value =
            shift.value === 'off' ? 'once' : shift.value === 'once' && now - lastShiftTap < DOUBLE_TAP_MS ? 'lock' : 'off'
          lastShiftTap = now
          break
        }
        case 'layout': {
          const next = (layoutIndex.value + 1) % layouts.value.length
          localLayout.value = next
          emit('update:layout', next)
          break
        }
      }
    }

    const { render } = useUikitNode(
      (initial) => new Container(initial),
      ({ isRoot }) => {
        const t = theme.value
        return {
          flexDirection: 'column',
          alignItems: 'center',
          gap: t.space[1],
          ...(isRoot
            ? {
                pixelSize: pixelSizeAt(props.distance ?? t.viewingDistance),
                padding: t.space[3],
                borderRadius: t.radius.lg,
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.border,
              }
            : {}),
          ...props.ui,
        }
      },
    )

    const label = (key: Key): string => {
      switch (key.kind) {
        case 'char':
          return shift.value === 'off' ? key.char : key.char.toUpperCase()
        case 'shift':
          return shift.value === 'lock' ? '⇪' : '⇧'
        case 'backspace':
          return '⌫'
        case 'enter':
          return props.enterLabel
        case 'layout':
          return layout.value.label
        case 'space':
          return ''
      }
    }

    return () => {
      const t = theme.value
      const unit = props.keySize ?? t.interaction.minTarget
      const gap = t.space[1]!
      // Keyed by layout: switching layouts rebuilds the rows instead of
      // patching keys in place (children added later would land at the end).
      return render(
        h(XrKeyboardBody, { key: layoutIndex.value, gap }, () =>
          rows.value.map((row, r) =>
            h(XrKeyboardRow, { key: r, gap }, () =>
              row.map((key, k) =>
                h(XrKey, {
                  key: k,
                  name: key.kind === 'char' ? `key-${key.char}` : `key-${key.kind}`,
                  label: label(key),
                  width: key.width * unit + (key.width - 1) * gap,
                  height: unit,
                  tone: key.kind === 'char' || key.kind === 'space' ? 'char' : key.kind === 'enter' ? 'accent' : 'action',
                  active: key.kind === 'shift' && shift.value !== 'off',
                  repeat: key.kind === 'backspace',
                  onPress: () => press(key),
                  onRepeat: () => send('Backspace'),
                }),
              ),
            ),
          ),
        ),
      )
    }
  },
})

const XrKeyboardBody = defineComponent({
  name: 'XrKeyboardBody',
  props: { gap: { type: Number, required: true } },
  setup(props, { slots }) {
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({ flexDirection: 'column', alignItems: 'center', gap: props.gap }),
    )
    return () => render(slots.default?.())
  },
})

const XrKeyboardRow = defineComponent({
  name: 'XrKeyboardRow',
  props: { gap: { type: Number, required: true } },
  setup(props, { slots }) {
    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({ flexDirection: 'row', gap: props.gap }),
    )
    return () => render(slots.default?.())
  },
})

const XrKey = defineComponent({
  name: 'XrKey',
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    tone: { type: String as PropType<'char' | 'action' | 'accent'>, required: true },
    active: Boolean,
    /** Fires `onRepeat` on down and keeps firing while held, instead of `onPress` on release. */
    repeat: Boolean,
    onPress: { type: Function as PropType<() => void>, required: true },
    onRepeat: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const theme = useXrTheme()
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      clearTimeout(timer)
      clearInterval(timer)
      timer = undefined
    }
    const press = usePress({
      disabled: () => false,
      // Sliding off a key onto the next one cancels it, like on a phone.
      cancelAfter: 0.03,
      onDown: () => {
        if (!props.repeat) return
        stop()
        props.onRepeat()
        timer = setTimeout(() => (timer = setInterval(() => props.onRepeat(), REPEAT_MS)), REPEAT_DELAY_MS)
      },
      onRelease: stop,
      onCancel: stop,
      onPress: () => {
        if (!props.repeat) props.onPress()
      },
    })
    onBeforeUnmount(stop)

    const { render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const c = t.colors
        const accent = props.tone === 'accent' || props.active
        const palette = accent
          ? { bg: c.primary, hover: c.primaryHover, active: c.primaryActive, fg: c.onPrimary }
          : props.tone === 'action'
            ? { bg: c.secondaryActive, hover: c.secondaryHover, active: c.secondary, fg: c.onSecondary }
            : { bg: c.secondary, hover: c.secondaryHover, active: c.secondaryActive, fg: c.onSecondary }
        return {
          width: props.width,
          height: props.height,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radius.sm,
          backgroundColor: palette.bg,
          color: palette.fg,
          cursor: 'pointer',
          hover: { backgroundColor: palette.hover },
          active: { backgroundColor: palette.active, transformTranslateZ: -t.interaction.pressDepth },
          ...press,
        }
      },
    )
    return () => render(props.label ? [h(XrText, { variant: 'label', text: props.label })] : [])
  },
})
