import { computed, defineComponent, h, onBeforeUnmount, ref, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { usePress } from '../runtime/press'
import { activeTextTarget } from '../runtime/text-target'
import { XrText } from './XrText'

/**
 * A keyboard layout. Only the letter rows: digits, Shift, Backspace, the
 * layout and symbols keys, space and Enter are added around them.
 *
 * ```ts
 * const greek: XrKeyboardLayout = {
 *   label: 'EL', name: 'Ελληνικά', locale: 'el',
 *   rows: [';ςερτυθιοπ', 'ασδφγηξκλ', 'ζχψωβνμ'],
 * }
 * ```
 */
export interface XrKeyboardLayout {
  /** Short name on the layout switch key, e.g. "EN". */
  label: string
  /** Full name shown on the space bar, e.g. "English". */
  name?: string
  /** BCP 47 locale for upper case (Turkish i → İ). */
  locale?: string
  /** Rows of keys, top to bottom, one character per key. Shift and Backspace go around the last row. */
  rows: string[]
  /** The two keys either side of the space bar. Defaults to `,` and `.`. */
  punctuation?: [string, string]
}

export const keyboardLayouts = {
  en: { label: 'EN', name: 'English', locale: 'en', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
  ru: { label: 'RU', name: 'Русский', locale: 'ru', rows: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбюё'] },
  uk: { label: 'UK', name: 'Українська', locale: 'uk', rows: ['йцукенгшщзхї', 'фівапролджє', 'ячсмитьбюґ'] },
  de: { label: 'DE', name: 'Deutsch', locale: 'de', rows: ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnmß'] },
  fr: { label: 'FR', name: 'Français', locale: 'fr', rows: ['azertyuiop', 'qsdfghjklm', 'wxcvbnéèàç'] },
  es: { label: 'ES', name: 'Español', locale: 'es', rows: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnmáéó'] },
} satisfies Record<string, XrKeyboardLayout>

export type XrKeyboardLayoutName = keyof typeof keyboardLayouts

/** The symbols page behind the ?123 key. */
const symbolRows = ['-/:;()$&@"', '[]{}#%^*+=', "_\\|~<>!?'"]

/** What a key press sends: a character, or one of the named keys. */
export type XrKeyboardKey = string | 'Backspace' | 'Enter'

type Shift = 'off' | 'once' | 'lock'
type Key =
  | { kind: 'char'; char: string; width: number }
  | { kind: 'shift' | 'backspace' | 'enter' | 'layout' | 'symbols' | 'space'; width: number }

/** Two Shift taps closer than this lock capitals on. */
const DOUBLE_TAP_MS = 400
/** Holding Backspace repeats after this long, then every REPEAT_MS. */
const REPEAT_DELAY_MS = 500
const REPEAT_MS = 70

/**
 * An on-screen keyboard sized for rays and fingertips.
 *
 * - `<XrKeyboard v-model="text" />` edits that string (at its end).
 * - Without v-model it types into the <XrTextField> focused last, at its caret.
 *
 * ```vue
 * <XrKeyboard :layouts="['en', 'de', myLayout]" v-model:layout="lang" :digits="false" />
 * ```
 *
 * It emits `key` for every press and `enter` on Enter. Shift is one
 * capital; tap it twice quickly for caps lock. Holding Backspace repeats.
 * The layout key (shown with more than one layout) cycles through
 * `layouts`; ?123 opens a page of symbols.
 *
 * Inside a panel or window it is a borderless block; on its own at the top
 * level of the scene it is a floating keyboard with its own background.
 */
export const XrKeyboard = defineComponent({
  name: 'XrKeyboard',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined },
    /** Built-in layout names (`en`, `ru`, `uk`, `de`, `fr`, `es`) and/or your own layouts. */
    layouts: {
      type: Array as PropType<Array<XrKeyboardLayoutName | XrKeyboardLayout>>,
      default: () => ['en', 'ru'],
    },
    /** Index into `layouts` of the active layout (v-model:layout). Uncontrolled if left out. */
    layout: Number,
    /** A row of digits on top. */
    digits: { type: Boolean, default: true },
    /** A ?123 key for a page of symbols. */
    symbols: { type: Boolean, default: true },
    /** Show the layout's name on the space bar. */
    spaceLabel: { type: Boolean, default: true },
    /** Width and height of one letter key in dmm. Defaults to the theme's minimum target. */
    keySize: Number,
    /** Label of the Enter key, e.g. "Send" or "Go". */
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
    const page = ref<'letters' | 'symbols'>('letters')

    const layouts = computed<XrKeyboardLayout[]>(() => {
      const list = props.layouts.map((l) => {
        if (typeof l !== 'string') return l
        const found = keyboardLayouts[l]
        if (!found) console.warn(`[vue-xr-ui] Unknown keyboard layout "${l}". Built in: ${Object.keys(keyboardLayouts).join(', ')}.`)
        return found
      })
      const valid = list.filter((l): l is XrKeyboardLayout => l != null && l.rows.length > 0)
      return valid.length > 0 ? valid : [keyboardLayouts.en]
    })
    const layoutIndex = computed(() => (props.layout ?? localLayout.value) % layouts.value.length)
    const layout = computed(() => layouts.value[layoutIndex.value]!)

    const length = (row: string) => [...row].length
    const letterRows = (l: XrKeyboardLayout) => [...(props.digits ? ['1234567890'] : []), ...l.rows]
    const symbolPage = () => [...(props.digits ? [] : ['1234567890']), ...symbolRows]
    /**
     * Every row is this many key units wide, across all layouts, so switching
     * layouts keeps the keyboard's size. The last row needs room for Shift
     * and Backspace.
     */
    const columns = computed(() => {
      const pages = [...layouts.value.map(letterRows), ...(props.symbols ? [symbolPage()] : [])]
      return Math.max(10, ...pages.flatMap((rows) => [...rows.map(length), length(rows.at(-1)!) + 3]))
    })

    const rows = computed<Key[][]>(() => {
      const chars = (row: string): Key[] => [...row].map((char) => ({ kind: 'char', char, width: 1 }))
      const source = page.value === 'symbols' ? symbolPage() : letterRows(layout.value)
      const last = source.at(-1)!
      const side = (columns.value - length(last)) / 2
      const [left, right] = (page.value === 'letters' && layout.value.punctuation) || [',', '.']
      const bottom: Key[] = [
        ...(layouts.value.length > 1 ? [{ kind: 'layout', width: 1.5 } as Key] : []),
        ...(props.symbols ? [{ kind: 'symbols', width: 1.5 } as Key] : []),
        { kind: 'char', char: left, width: 1 },
        { kind: 'space', width: 0 },
        { kind: 'char', char: right, width: 1 },
        { kind: 'enter', width: 2 },
      ]
      const space = bottom.find((k) => k.kind === 'space')!
      space.width = columns.value - bottom.reduce((sum, k) => sum + k.width, 0)
      return [
        ...source.slice(0, -1).map(chars),
        [{ kind: 'shift', width: side }, ...chars(last), { kind: 'backspace', width: side }],
        bottom,
      ]
    })

    const upper = (char: string) =>
      shift.value === 'off' || page.value === 'symbols' ? char : char.toLocaleUpperCase(layout.value.locale)

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
          send(upper(key.char))
          if (shift.value === 'once' && page.value === 'letters') shift.value = 'off'
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
          page.value = 'letters'
          emit('update:layout', next)
          break
        }
        case 'symbols':
          page.value = page.value === 'letters' ? 'symbols' : 'letters'
          break
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
          return upper(key.char)
        case 'shift':
          return shift.value === 'lock' ? '⇪' : '⇧'
        case 'backspace':
          return '⌫'
        case 'enter':
          return props.enterLabel
        case 'layout':
          return layout.value.label
        case 'symbols':
          return page.value === 'letters' ? '?123' : 'ABC'
        case 'space':
          return props.spaceLabel ? (layout.value.name ?? '') : ''
      }
    }

    return () => {
      const t = theme.value
      const unit = props.keySize ?? t.interaction.minTarget
      const gap = t.space[1]!
      // Keyed by layout: switching layouts rebuilds the rows instead of
      // patching keys in place (children added later would land at the end).
      return render(
        h(XrKeyboardBody, { key: `${layoutIndex.value}-${page.value}`, gap }, () =>
          rows.value.map((row, r) =>
            h(XrKeyboardRow, { key: r, gap }, () =>
              row.map((key, k) =>
                h(XrKey, {
                  key: k,
                  name: key.kind === 'char' ? `key-${key.char}` : `key-${key.kind}`,
                  label: label(key),
                  width: key.width * unit + (key.width - 1) * gap,
                  height: unit,
                  tone: key.kind === 'char' ? 'char' : key.kind === 'space' ? 'space' : key.kind === 'enter' ? 'accent' : 'action',
                  active: key.kind === 'shift' && shift.value !== 'off' && page.value === 'letters',
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
    tone: { type: String as PropType<'char' | 'space' | 'action' | 'accent'>, required: true },
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
    return () =>
      render(
        props.label
          ? [h(XrText, props.tone === 'space' ? { variant: 'caption', muted: true, text: props.label } : { variant: 'label', text: props.label })]
          : [],
      )
  },
})
