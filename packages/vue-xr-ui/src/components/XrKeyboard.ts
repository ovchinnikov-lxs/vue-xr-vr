import { computed, defineComponent, h, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container, Svg } from '@pmndrs/uikit'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { usePress } from '../runtime/press'
import { activeTextTarget } from '../runtime/text-target'
import { injectAppWide } from '../runtime/app-inject'
import { XR_CONTROLLER } from '../runtime/context'
import { webSpeechRecognizer, type XrSpeechHandle, type XrSpeechRecognizer } from '../runtime/speech'
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
  /** BCP 47 locale: upper case (Turkish i → İ) and the voice input language. */
  locale?: string
  /** Rows of keys, top to bottom, one character per key. Shift and Backspace go around the last row. */
  rows: string[]
  /** The two keys either side of the space bar. Defaults to `,` and `.`. */
  punctuation?: [string, string]
}

export const keyboardLayouts = {
  en: { label: 'EN', name: 'English', locale: 'en-US', rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] },
  ru: { label: 'RU', name: 'Русский', locale: 'ru-RU', rows: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбюё'] },
  uk: { label: 'UK', name: 'Українська', locale: 'uk-UA', rows: ['йцукенгшщзхї', 'фівапролджє', 'ячсмитьбюґ'] },
  de: { label: 'DE', name: 'Deutsch', locale: 'de-DE', rows: ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnmß'] },
  fr: { label: 'FR', name: 'Français', locale: 'fr-FR', rows: ['azertyuiop', 'qsdfghjklm', 'wxcvbnéèàç'] },
  es: { label: 'ES', name: 'Español', locale: 'es-ES', rows: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnmáéó'] },
} satisfies Record<string, XrKeyboardLayout>

export type XrKeyboardLayoutName = keyof typeof keyboardLayouts

/** The symbols page behind the ?123 key. */
const symbolRows = ['-/:;()$&@"', '[]{}#%^*+=', "_\\|~<>!?'"]

/** What a key press sends: a character, or one of the named keys. */
export type XrKeyboardKey = string | 'Backspace' | 'Enter'

type Shift = 'off' | 'once' | 'lock'
type Key =
  | { kind: 'char'; char: string; width: number }
  | { kind: 'shift' | 'backspace' | 'enter' | 'layout' | 'symbols' | 'voice' | 'space'; width: number }

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
 *
 * In a session with a system keyboard (Meta Quest Browser) the headset's
 * own keyboard opens when a field is focused, so a keyboard without v-model
 * hides itself there (see `preferSystemKeyboard`).
 */
export const XrKeyboard = defineComponent({
  name: 'XrKeyboard',
  inheritAttrs: false,
  props: {
    /** Text the keyboard edits by itself (`v-model`). Leave it out to type into the last focused XrTextField. */
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
    /**
     * A microphone key for voice input in the active layout's language.
     * `true`: the browser's Web Speech API (the key is hidden where there is
     * none). Pass a recognizer for your own speech to text, e.g.
     * `recordingRecognizer(transcribe)`. `false` hides the key.
     */
    voice: { type: [Boolean, Object] as PropType<boolean | XrSpeechRecognizer>, default: true },
    /** Only for a root keyboard: reading distance in metres. */
    distance: Number,
    /**
     * Hide while the XR session has a system keyboard (Meta Quest Browser),
     * which opens by itself when a text field is focused. Only applies
     * without v-model: a keyboard bound to a string is the only way to edit it.
     */
    preferSystemKeyboard: { type: Boolean, default: true },
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** The edited text, with `v-model` only. */
    'update:modelValue': (_value: string) => true,
    /** The active layout changed (the layout key or a tab): its index in `layouts` (`v-model:layout`). */
    'update:layout': (_index: number) => true,
    /** A key was typed: the character, or `Backspace` / `Enter`. */
    key: (_key: XrKeyboardKey) => true,
    /** Enter was pressed. */
    enter: () => true,
    /** Voice input failed, e.g. "not-allowed" (no microphone permission) or "network". */
    voiceError: (_error: string) => true,
  },
  setup(props, { emit }) {
    const theme = useXrTheme()
    const xr = injectAppWide(XR_CONTROLLER)
    const hidden = computed(
      () => props.preferSystemKeyboard && props.modelValue === undefined && Boolean(xr?.systemKeyboard.value),
    )
    const shift = ref<Shift>('off')
    let lastShiftTap = 0
    const localLayout = ref(0)
    const page = ref<'letters' | 'symbols'>('letters')

    // Voice input.
    const browserSpeech = webSpeechRecognizer()
    const recognizer = computed(() => (props.voice === true ? browserSpeech : props.voice || undefined))
    const listening = ref(false)
    const heard = ref('')
    const voiceError = ref<string>()
    let speech: XrSpeechHandle | undefined
    let errorTimer: ReturnType<typeof setTimeout> | undefined
    const stopListening = () => speech?.stop()
    onBeforeUnmount(() => {
      stopListening()
      clearTimeout(errorTimer)
    })

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
      // The bottom row's fixed keys need room for a space bar of at least 4.
      const bottom = (layouts.value.length > 1 ? 1.5 : 0) + (props.symbols ? 1.5 : 0) + (recognizer.value ? 1 : 0) + 4 + 4
      return Math.max(10, bottom, ...pages.flatMap((rows) => [...rows.map(length), length(rows.at(-1)!) + 3]))
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
        ...(recognizer.value ? [{ kind: 'voice', width: 1 } as Key] : []),
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

    /** Types recognised speech, with a space before it unless at the start or after one. */
    const typeSpeech = (text: string) => {
      const words = text.trim()
      if (!words) return
      const before = props.modelValue ?? activeTextTarget.value?.textBeforeCaret() ?? ''
      send(before === '' || /\s$/.test(before) ? words : ` ${words}`)
    }

    const toggleVoice = () => {
      if (speech) return stopListening()
      const voice = recognizer.value
      if (!voice) return
      voiceError.value = undefined
      clearTimeout(errorTimer)
      listening.value = true
      heard.value = ''
      speech = voice.start({
        lang: layout.value.locale ?? navigator.language,
        onPartial: (text) => (heard.value = text),
        onResult: (text) => {
          heard.value = ''
          typeSpeech(text)
        },
        onError: (error) => {
          voiceError.value = error
          emit('voiceError', error)
          errorTimer = setTimeout(() => (voiceError.value = undefined), 3000)
        },
        onEnd: () => {
          speech = undefined
          listening.value = false
          heard.value = ''
        },
      })
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
          stopListening()
          const next = (layoutIndex.value + 1) % layouts.value.length
          localLayout.value = next
          page.value = 'letters'
          emit('update:layout', next)
          break
        }
        case 'symbols':
          page.value = page.value === 'letters' ? 'symbols' : 'letters'
          break
        case 'voice':
          toggleVoice()
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
          ...(hidden.value ? { display: 'none' } : {}),
        }
      },
    )
    watch(hidden, (now) => now && stopListening())

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
        case 'voice':
          return ''
        case 'space':
          if (voiceError.value) return voiceErrorText(voiceError.value)
          if (listening.value) return heard.value || 'Listening…'
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
                  active:
                    (key.kind === 'shift' && shift.value !== 'off' && page.value === 'letters') ||
                    (key.kind === 'voice' && listening.value),
                  icon: key.kind === 'voice' ? MIC_ICON : undefined,
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
    /** SVG markup drawn instead of the label, tinted with the key's text colour. */
    icon: String,
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
        props.icon
          ? [h(XrKeyIcon, { content: props.icon, size: Math.round(props.height * 0.45) })]
          : props.label
          ? [h(XrText, props.tone === 'space' ? { variant: 'caption', muted: true, text: props.label } : { variant: 'label', text: props.label })]
          : [],
      )
  },
})

const XrKeyIcon = defineComponent({
  name: 'XrKeyIcon',
  props: { content: { type: String, required: true }, size: { type: Number, required: true } },
  setup(props) {
    const { render } = useUikitNode(
      (initial) => new Svg(initial),
      () => ({ content: props.content, width: props.size, height: props.size, pointerEvents: 'none' }),
    )
    return () => render()
  },
})

const MIC_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>'

/** A short message on the space bar for a voice input error. */
function voiceErrorText(error: string): string {
  if (error === 'not-allowed' || error === 'NotAllowedError' || error === 'service-not-allowed') return 'Microphone not allowed'
  if (error === 'network') return 'Voice input needs a network'
  if (error === 'audio-capture' || error === 'NotFoundError') return 'No microphone'
  return 'Voice input failed'
}
