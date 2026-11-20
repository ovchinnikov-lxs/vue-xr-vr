import { defineComponent, markRaw, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container, Text } from '@pmndrs/uikit'
import { useXrTheme } from '../composables/useXrTheme'
import { useChildNode, useUikitNode } from '../runtime/node'

/**
 * Shows a short hint over (or under) whatever it wraps while a pointer
 * hovers it: a ray, a fingertip close to it, or the mouse.
 *
 * ```vue
 * <XrTooltip text="Switch light / dark"><XrButton>Theme</XrButton></XrTooltip>
 * ```
 */
export const XrTooltip = defineComponent({
  name: 'XrTooltip',
  inheritAttrs: false,
  props: {
    text: { type: String, required: true },
    placement: { type: String as PropType<'top' | 'bottom'>, default: 'top' },
    /** Hover time (ms) before it shows, so sweeping a ray across UI does not flash hints. */
    delay: { type: Number, default: 400 },
    disabled: Boolean,
  },
  setup(props, { slots }) {
    const theme = useXrTheme()
    const visible = ref(false)
    // Several pointers can hover at once (two controllers); show while any does.
    const hovering = new Set<number>()
    let timer: ReturnType<typeof setTimeout> | undefined
    const clear = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
    }
    onBeforeUnmount(clear)

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({
        flexDirection: 'column',
        // Also centres the hint, which is positioned absolutely.
        alignItems: 'center',
        onPointerEnter: (e: { pointerId?: number }) => {
          if (e.pointerId == null || props.disabled) return
          hovering.add(e.pointerId)
          if (!visible.value && !timer) timer = setTimeout(() => ((timer = undefined), (visible.value = hovering.size > 0)), props.delay)
        },
        onPointerLeave: (e: { pointerId?: number }) => {
          if (e.pointerId != null) hovering.delete(e.pointerId)
          if (hovering.size === 0) {
            clear()
            visible.value = false
          }
        },
      }),
    )
    watch(
      () => props.disabled,
      (d) => d && ((visible.value = false), clear()),
    )

    const bubble = useChildNode(node, () => {
      const t = theme.value
      const gap = t.space[2]!
      return {
        positionType: 'absolute',
        ...(props.placement === 'top' ? { positionBottom: '100%', marginBottom: gap } : { positionTop: '100%', marginTop: gap }),
        display: visible.value ? 'flex' : 'none',
        paddingX: t.space[3],
        paddingY: t.space[2],
        borderRadius: t.radius.sm,
        backgroundColor: t.colors.text,
        color: t.colors.surface,
        // Drawn over neighbours, and never the target of a pointer itself.
        zIndexOffset: 10,
        pointerEvents: 'none',
      }
    })
    bubble.name = 'tooltip'
    const label = markRaw(new Text({ text: props.text } as never))
    bubble.add(label)
    watch(
      () => [props.text, theme.value] as const,
      ([text, t]) =>
        label.setProperties({
          text,
          fontSize: t.typography.caption.fontSize,
          lineHeight: t.typography.caption.lineHeight,
          fontWeight: 'medium',
          wordBreak: 'keep-all',
        } as never),
      { immediate: true },
    )
    onBeforeUnmount(() => label.dispose())

    return () => render(slots.default?.())
  },
})
