import { defineComponent, ref, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { useChildNode, useUikitNode } from '../runtime/node'
import { fractionAlong, usePress, type ControlPointerEvent } from '../runtime/press'

/**
 * Picks a number in a range: `<XrSlider v-model="volume" :min="0" :max="100" />`.
 *
 * Press anywhere on it to jump there, then drag. Works with a controller
 * ray, a pinch ray, a fingertip sliding along it, and the mouse. Emits
 * `update:modelValue` while dragging and `change` once on release.
 *
 * The target is `interaction.minTarget` tall even though the track is thin:
 * a thin bar is hard to hit with a ray and harder with a finger.
 */
export const XrSlider = defineComponent({
  name: 'XrSlider',
  inheritAttrs: false,
  props: {
    /** The value (`v-model`), between `min` and `max`. */
    modelValue: { type: Number, default: 0 },
    /** Value at the left end. */
    min: { type: Number, default: 0 },
    /** Value at the right end. */
    max: { type: Number, default: 100 },
    /** Values snap to multiples of it from `min`. */
    step: { type: Number, default: 1 },
    /** Greys it out; it does not react to any input. */
    disabled: Boolean,
    /** Width in dmm. Ignored with `block`. */
    width: { type: Number, default: 240 },
    /** Stretch to the parent's width. */
    block: Boolean,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** The value while dragging (`v-model`). */
    'update:modelValue': (_value: number) => true,
    /** The value when the drag ends (released). */
    change: (_value: number) => true,
  },
  setup(props, { emit }) {
    const theme = useXrTheme()
    const dragging = ref(false)
    // The value shown while dragging, so the thumb follows the pointer even
    // if the parent does not bind v-model.
    const live = ref<number>()

    const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v))
    const fraction = () => {
      const span = props.max - props.min
      return span > 0 ? (clamp(live.value ?? props.modelValue) - props.min) / span : 0
    }
    const valueAt = (f: number) => {
      const steps = Math.round((f * (props.max - props.min)) / props.step)
      // Round to the step's precision so 0.1 steps give 0.3, not 0.30000000000000004.
      const decimals = (String(props.step).split('.')[1] ?? '').length
      return clamp(Number((props.min + steps * props.step).toFixed(decimals)))
    }

    const thumbSize = 24
    const trackHeight = 8

    const setFrom = (event: ControlPointerEvent) => {
      const f = fractionAlong(track, event)
      if (f == null) return
      const next = valueAt(f)
      if (next === (live.value ?? props.modelValue)) return
      live.value = next
      emit('update:modelValue', next)
    }
    const press = usePress({
      disabled: () => props.disabled,
      onDown: (event) => {
        dragging.value = true
        setFrom(event)
      },
      onMove: setFrom,
      onRelease: (event) => {
        // The release point counts too: the last move may arrive with it.
        if (!props.disabled) setFrom(event)
        dragging.value = false
        const value = live.value
        live.value = undefined
        if (value != null && !props.disabled) emit('change', value)
      },
    })

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          height: t.interaction.minTarget,
          ...(props.block ? { alignSelf: 'stretch' } : { width: props.width, flexShrink: 0 }),
          flexDirection: 'row',
          alignItems: 'center',
          // Keeps the thumb inside the target at both ends.
          paddingX: thumbSize / 2,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          ...press,
          ...props.ui,
        }
      },
    )

    const track = useChildNode(node, () => {
      const c = theme.value.colors
      return {
        flexGrow: 1,
        height: trackHeight,
        borderRadius: theme.value.radius.full,
        backgroundColor: c.surfaceSunken,
        borderWidth: 1,
        borderColor: c.border,
      }
    })
    // Named so tools and tests can find it: values map across the track, not the padded target.
    track.name = 'track'
    useChildNode(track, () => {
      const c = theme.value.colors
      return {
        positionType: 'absolute',
        positionLeft: 0,
        positionTop: 0,
        height: '100%',
        width: `${fraction() * 100}%`,
        borderRadius: theme.value.radius.full,
        backgroundColor: props.disabled ? c.disabled : c.primary,
      }
    })
    useChildNode(track, () => {
      const c = theme.value.colors
      return {
        positionType: 'absolute',
        positionLeft: `${fraction() * 100}%`,
        positionTop: (trackHeight - thumbSize) / 2,
        marginLeft: -thumbSize / 2,
        width: thumbSize,
        height: thumbSize,
        borderRadius: theme.value.radius.full,
        backgroundColor: props.disabled ? c.onDisabled : c.onPrimary,
        borderWidth: 2,
        borderColor: props.disabled ? c.disabled : c.primary,
        // Lifts while held: there is no cursor for a fingertip, so this is the
        // sign that the slider has it.
        transformScale: dragging.value ? 1.2 : 1,
        transformTranslateZ: dragging.value ? 2 : 0,
      }
    })

    return () => render()
  },
})
