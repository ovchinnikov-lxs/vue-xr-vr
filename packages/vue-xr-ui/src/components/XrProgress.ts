import { computed, defineComponent, h, ref, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { useXrFrame } from '../composables/useXrFrame'
import { useXrTheme } from '../composables/useXrTheme'
import { useUikitNode } from '../runtime/node'
import { XrBox } from './XrBox'
import { XrText } from './XrText'

/** Indeterminate bar: one sweep across the track, in ms. */
const SWEEP_MS = 1500
/** Share of the track the indeterminate segment covers. */
const SEGMENT = 0.35
/** Spinner: dots around the ring, and how long each step shows. */
const DOTS = 8
const STEP_MS = 100

/**
 * Progress: a bar that fills up to `value / max`, or a spinner.
 *
 * ```vue
 * <XrProgress :value="downloaded" :max="total" label="Downloading" show-value />
 * <XrProgress indeterminate />
 * <XrProgress variant="spinner" />
 * ```
 *
 * `indeterminate` (or a spinner) is for work whose length is unknown: the
 * bar then sweeps a segment across the track. It animates with the XR frame
 * loop, so it keeps moving inside the headset.
 */
export const XrProgress = defineComponent({
  name: 'XrProgress',
  inheritAttrs: false,
  props: {
    /** How much is done, from 0 to `max`. Clamped. */
    value: { type: Number, default: 0 },
    /** The value at which it is complete. */
    max: { type: Number, default: 100 },
    /** A bar that fills, or a spinning ring of dots. */
    variant: { type: String as PropType<'bar' | 'spinner'>, default: 'bar' },
    /** The amount is unknown: the bar sweeps instead of filling. A spinner always is. */
    indeterminate: Boolean,
    /** Text above the bar (next to a spinner). */
    label: String,
    /** Show the percentage at the end of the label row (bar only, not when indeterminate). */
    showValue: Boolean,
    /** Spinner diameter, or bar thickness, in dmm. Defaults to 32 (spinner) and 8 (bar). */
    size: Number,
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties for the outer container, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const theme = useXrTheme()
    const fraction = computed(() => (props.max > 0 ? Math.min(1, Math.max(0, props.value / props.max)) : 0))

    // The spinner reads `time` through a step (a re-render eight times a
    // second); the indeterminate bar never re-renders for it: its segment
    // is moved by a transform set straight on the node, which needs no
    // relayout and no Vue render.
    const time = ref(0)
    let sweep = 0
    useXrFrame((delta) => {
      if (props.variant === 'spinner') time.value += delta
      else if (props.indeterminate) {
        sweep = (sweep + delta) % SWEEP_MS
        const fill = node.getObjectByName('fill') as Container | undefined
        const width = fill?.parentContainer.value?.size.value?.[0]
        if (fill && width) fill.setProperties({ transformTranslateX: ((sweep / SWEEP_MS) * (1 + SEGMENT) - SEGMENT) * width } as never)
      }
    })

    // Re-renders only when the spinner moves a step, not every frame.
    const spinnerStep = computed(() => Math.floor(time.value / STEP_MS) % DOTS)

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({
        flexDirection: props.variant === 'spinner' ? 'row' : 'column',
        alignItems: props.variant === 'spinner' ? 'center' : 'stretch',
        alignSelf: props.variant === 'spinner' ? 'flex-start' : 'stretch',
        gap: theme.value.space[2],
        flexShrink: 0,
        ...props.ui,
      }),
    )

    const bar = () => {
      const t = theme.value
      const c = t.colors
      const thickness = props.size ?? 8
      let fill: Record<string, unknown>
      if (props.indeterminate) {
        // Moved across the track every frame (see the frame callback above).
        fill = { positionType: 'absolute', positionTop: 0, positionLeft: 0, width: `${SEGMENT * 100}%`, transformTranslateX: -10000 }
      } else {
        fill = { width: `${fraction.value * 100}%`, display: fraction.value > 0 ? 'flex' : 'none' }
      }
      const header =
        props.label != null || (props.showValue && !props.indeterminate)
          ? h(XrBox, { direction: 'row', justify: 'space-between', align: 'center', gap: 3 }, () => [
              h(XrText, { variant: 'label', text: props.label ?? '' }),
              ...(props.showValue && !props.indeterminate
                ? [h(XrText, { name: 'value', variant: 'caption', muted: true, text: `${Math.round(fraction.value * 100)}%` })]
                : []),
            ])
          : null
      const track = h(
        XrBox,
        {
          name: 'track',
          direction: 'row',
          ui: { height: thickness, borderRadius: t.radius.full, backgroundColor: c.secondary, overflow: 'hidden', flexShrink: 0 },
        },
        () => [h(XrBox, { name: 'fill', ui: { height: thickness, borderRadius: t.radius.full, backgroundColor: c.primary, ...fill } })],
      )
      return header ? [header, track] : [track]
    }

    const spinner = () => {
      const t = theme.value
      const size = props.size ?? 32
      const dot = Math.max(3, size * 0.2)
      const r = size / 2 - dot / 2
      const step = spinnerStep.value
      const dots = Array.from({ length: DOTS }, (_, i) => {
        const a = (i / DOTS) * Math.PI * 2
        return h(XrBox, {
          ui: {
            positionType: 'absolute',
            positionLeft: size / 2 + r * Math.sin(a) - dot / 2,
            positionTop: size / 2 - r * Math.cos(a) - dot / 2,
            width: dot,
            height: dot,
            borderRadius: t.radius.full,
            backgroundColor: t.colors.primary,
            // Brightest last: turning clockwise, it leads and the rest trail behind.
            opacity: 0.15 + (0.85 * (i + 1)) / DOTS,
          },
        })
      })
      const ring = h(
        XrBox,
        // Positive is counter-clockwise.
        { name: 'ring', ui: { width: size, height: size, flexShrink: 0, transformRotateZ: -step * (360 / DOTS) } },
        () => dots,
      )
      return props.label != null ? [ring, h(XrText, { variant: 'label', text: props.label })] : [ring]
    }

    return () => render(props.variant === 'spinner' ? spinner() : bar())
  },
})
