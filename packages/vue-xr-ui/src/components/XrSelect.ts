import { computed, defineComponent, h, inject, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import type { Object3D } from 'three'
import { useXrTheme } from '../composables/useXrTheme'
import { PRESS_HUB, type ScenePointerEvent } from '../runtime/context'
import { useUikitNode } from '../runtime/node'
import { usePopupLayer } from '../runtime/popup'
import { usePress } from '../runtime/press'
import { XrBox } from './XrBox'
import { XrList, XrListItem } from './XrList'
import { XrPanel } from './XrPanel'
import { XrText } from './XrText'

/** What an XrSelect's `v-model` holds: the chosen option's `value`. */
export type XrSelectValue = string | number

/** One choice of an XrSelect. A plain string is both its label and its value. */
export interface XrSelectOption {
  /** Text in the list and, once chosen, in the field. */
  label: string
  /** Written to `v-model` when chosen; unique within the options. */
  value: XrSelectValue
  /** A second, muted line under the label. */
  description?: string
  /** Shown greyed out; cannot be chosen. */
  disabled?: boolean
}

const normalize = (option: string | XrSelectOption): XrSelectOption =>
  typeof option === 'string' ? { label: option, value: option } : option

/**
 * A dropdown: a field that shows the chosen option and, when pressed, opens
 * a list of options floating over the content around it.
 *
 * ```vue
 * <XrSelect v-model="quality" :options="['Low', 'Medium', 'High']" />
 * <XrSelect
 *   v-model="voice"
 *   :options="[{ label: 'Nova', value: 'nova', description: 'Warm, calm' }, { label: 'Echo', value: 'echo' }]"
 * />
 * ```
 *
 * It opens and chooses with every input: mouse, controller ray, pinch and
 * fingertip. It closes on a choice, on a press on the field again, on
 * Escape, and on a press anywhere outside it (other vue-xr-ui UI or empty
 * space). A press outside that lands on another control also presses it.
 * The list scrolls when it is taller than `maxHeight`. It is a layout root
 * of its own that follows the field, so a scrolling or clipping container
 * around the select (an XrList) does not cut it off.
 */
export const XrSelect = defineComponent({
  name: 'XrSelect',
  inheritAttrs: false,
  props: {
    /** The chosen option's value. Use with `v-model`. */
    modelValue: [String, Number] as PropType<XrSelectValue>,
    /** The choices: strings, or `{ label, value, description?, disabled? }`. */
    options: { type: Array as PropType<ReadonlyArray<string | XrSelectOption>>, default: () => [] },
    /** Shown, muted, while no option is chosen. */
    placeholder: { type: String, default: 'Select…' },
    /** Greys the field out and closes the list; it then does not open. */
    disabled: Boolean,
    /** Open the list below the field (`bottom`) or above it (`top`). */
    placement: { type: String as PropType<'bottom' | 'top'>, default: 'bottom' },
    /** Height (dmm) above which the list scrolls. */
    maxHeight: { type: Number, default: 240 },
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties for the outer container, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** An option was chosen (`v-model`). */
    'update:modelValue': (_value: XrSelectValue) => true,
    /** An option other than the current one was chosen. */
    change: (_value: XrSelectValue, _option: XrSelectOption) => true,
    /** The list opened. */
    open: () => true,
    /** The list closed, by a choice or otherwise. */
    close: () => true,
  },
  setup(props, { emit, expose }) {
    const theme = useXrTheme()
    const presses = inject(PRESS_HUB, undefined)
    const isOpen = ref(false)
    const options = computed(() => props.options.map(normalize))
    const selected = computed(() => options.value.find((o) => o.value === props.modelValue))

    let stopListening: (() => void) | undefined
    // Capture phase, and stop it: one Escape closes the list, not also the
    // XrDialog the select is in (its listener is on the same window).
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      setOpen(false)
    }
    const setOpen = (open: boolean) => {
      if (open === isOpen.value || (open && props.disabled)) return
      isOpen.value = open
      stopListening?.()
      stopListening = undefined
      if (open) {
        const stopDown = presses?.onDown(onSceneDown)
        if (typeof window !== 'undefined') window.addEventListener('keydown', onKey, true)
        stopListening = () => {
          stopDown?.()
          if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey, true)
        }
        emit('open')
      } else {
        emit('close')
      }
    }
    watch(
      () => props.disabled,
      (disabled) => disabled && setOpen(false),
    )
    onBeforeUnmount(() => stopListening?.())

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({
        flexDirection: 'column',
        alignSelf: 'stretch',
        flexShrink: 0,
        ...props.ui,
      }),
    )

    // Close on a press anywhere but inside this select. The opening press
    // has already gone down by the time this listens (a press counts on
    // release). Sphere pointers (a hand's grab pointer, and its fingertip
    // touch pointer) report a press on empty space whenever nothing is near
    // the hand: every pinch, every time the finger pulls back. Only a
    // sphere press on something is a press outside.
    const onSceneDown = (event: ScenePointerEvent) => {
      if (event.details?.type === 'sphere' && (event.object as { isVoidObject?: boolean } | undefined)?.isVoidObject) return
      for (let o: Object3D | null | undefined = event.object; o; o = o.parent) if (o === node || o === popup.root) return
      setOpen(false)
    }

    const popup = usePopupLayer(node, {
      open: () => isOpen.value,
      placement: () => props.placement,
      gap: () => theme.value.space[2]!,
      lift: () => theme.value.space[2]!,
      onAnchorHidden: () => setOpen(false),
    })

    const press = usePress({ disabled: () => props.disabled, onPress: () => setOpen(!isOpen.value) })

    const choose = (option: XrSelectOption) => {
      if (option.disabled) return
      const changed = option.value !== props.modelValue
      emit('update:modelValue', option.value)
      if (changed) emit('change', option.value, option)
      setOpen(false)
    }

    expose({ open: () => setOpen(true), close: () => setOpen(false) })

    return () => {
      const t = theme.value
      const c = t.colors
      const open = isOpen.value
      const label = selected.value?.label
      const gap = t.space[2]!

      const trigger = h(
        XrBox,
        {
          name: 'trigger',
          direction: 'row',
          align: 'center',
          justify: 'space-between',
          gap: 3,
          ui: {
            // The same height and frame as XrTextField, so forms line up.
            height: t.interaction.minTarget + gap,
            paddingX: t.space[4],
            borderRadius: t.radius.md,
            borderWidth: 2,
            borderColor: open ? c.primary : c.border,
            backgroundColor: props.disabled ? c.disabled : c.surfaceSunken,
            color: props.disabled ? c.onDisabled : c.text,
            cursor: props.disabled ? 'not-allowed' : 'pointer',
            ...(props.disabled
              ? {}
              : {
                  ...(open ? {} : { hover: { borderColor: c.textMuted } }),
                  // Sink back on press: the feedback for a poke.
                  active: { transformTranslateZ: -t.interaction.pressDepth },
                }),
            ...press,
          },
        },
        () => [
          h(XrText, { variant: 'body', text: label ?? props.placeholder, muted: label == null || props.disabled, ui: { flexShrink: 1 } }),
          // A chevron from two borders of a rotated square: the bundled
          // fonts have no ▾ glyph.
          h(XrBox, {
            name: 'chevron',
            ui: {
              width: 10,
              height: 10,
              flexShrink: 0,
              borderRightWidth: 2,
              borderBottomWidth: 2,
              borderColor: props.disabled ? c.onDisabled : c.textMuted,
              // Positive is counter-clockwise: -45 points the corner down.
              transformRotateZ: open ? 135 : -45,
              ...(open ? { marginTop: 6 } : { marginBottom: 6 }),
            },
          }),
        ],
      )

      const list = h(
        XrPanel,
        {
          name: 'options',
          variant: 'raised',
          padding: 2,
          gap: 1,
          // Its own root (see usePopupLayer) is drawn over the content
          // around it, a little closer to the viewer, and first in line for
          // a pointer. Hidden rather than unmounted: it keeps its scroll position.
          ui: { alignSelf: 'stretch', display: open ? 'flex' : 'none' },
        },
        () =>
          h(XrList, { maxHeight: props.maxHeight, gap: 1 }, () =>
            options.value.map((option) =>
              h(XrListItem, {
                key: `${typeof option.value}:${option.value}`,
                name: `option-${option.value}`,
                label: option.label,
                description: option.description,
                selected: option.value === props.modelValue,
                disabled: option.disabled,
                onClick: () => choose(option),
              }),
            ),
          ),
      )

      return render([trigger, h(popup.Portal, { root: popup.root }, () => [list])])
    }
  },
})
