import { defineComponent, h, inject, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { Vector3 } from 'three'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { XR_VIEW } from '../runtime/context'
import { closeModal, modalStack, openModal } from '../runtime/modal'
import { useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { XrBox } from './XrBox'
import { XrButton } from './XrButton'
import { XrPanel } from './XrPanel'
import { XrText } from './XrText'

type Vec3 = [number, number, number]

/** How far the backdrop reaches around the dialog, in metres. */
const BACKDROP_SIZE = 6
/**
 * Default distance as a share of the theme's viewing distance: a step in
 * front of the panels at reading distance, so the backdrop covers them
 * (and wins the pointer hit test) instead of cutting through them.
 */
const NEARER = 0.75
/** Each dialog opened over another comes this much closer, so the newer one is in front. */
const STACK_STEP = 0.85

/**
 * A modal panel that opens in front of the viewer, at reading distance and
 * facing them, over a backdrop that dims and blocks the UI behind it.
 *
 * ```vue
 * <XrDialog v-model:open="open" title="Delete track?">
 *   <XrText>This cannot be undone.</XrText>
 *   <template #actions>
 *     <XrButton variant="ghost" label="Cancel" @click="open = false" />
 *     <XrButton label="Delete" @click="remove" />
 *   </template>
 * </XrDialog>
 * ```
 *
 * It closes on its Close button, on Escape, and on a press on the backdrop
 * (every input: mouse, controller ray, pinch, fingertip). The backdrop is a
 * plane just behind the dialog: it blocks UI farther away than the dialog,
 * not objects between the viewer and it. Place it at the top level of the
 * scene (not inside another panel).
 *
 * While it is open, text fields outside it cannot take focus (a focused one
 * loses it, and XrKeyboard stops typing into it); on close, focus goes back
 * to the field that had it. A dialog opened over another opens in front of
 * it, and Escape closes only the topmost.
 */
export const XrDialog = defineComponent({
  name: 'XrDialog',
  inheritAttrs: false,
  props: {
    /** Whether the dialog is shown. Use with `v-model:open`. */
    open: Boolean,
    /** Title in the header. The `title` slot replaces it. */
    title: String,
    /** Width of the dialog in dmm. */
    width: { type: Number, default: 480 },
    /**
     * Distance from the viewer in metres when it opens. Defaults to 0.75 × the theme's
     * `viewingDistance`, in front of other panels. Also sets the scale, so the dialog
     * looks the same size at any distance; with `position`, pass the distance it ends up at.
     */
    distance: Number,
    /** Where to open, in scene coordinates, instead of in front of the viewer. It then faces the viewer from there. */
    position: Array as unknown as PropType<Vec3>,
    /** Show the Close button in the header. */
    closable: { type: Boolean, default: true },
    /** Dim and block what is behind the dialog. */
    backdrop: { type: Boolean, default: true },
    /** Close on a press on the backdrop. */
    closeOnBackdrop: { type: Boolean, default: true },
    /** Close on Escape (desktop keyboard). */
    closeOnEscape: { type: Boolean, default: true },
    /** Escape hatch: raw uikit (`@pmndrs/uikit`) properties for the panel, merged last. */
    ui: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: {
    /** The dialog asks to open or close (`v-model:open`). */
    'update:open': (_open: boolean) => true,
    /** The dialog was closed by its Close button, Escape or the backdrop. `reason` says which. */
    close: (_reason: 'button' | 'escape' | 'backdrop') => true,
  },
  setup(props, { slots, emit }) {
    const theme = useXrTheme()
    const view = inject(XR_VIEW, undefined)
    /** How many dialogs were open under this one when it opened. */
    const depth = ref(0)
    const distance = () => props.distance ?? theme.value.viewingDistance * NEARER * STACK_STEP ** depth.value

    const close = (reason: 'button' | 'escape' | 'backdrop') => {
      if (!props.open) return
      emit('close', reason)
      emit('update:open', false)
    }

    // Only a press that starts and ends on the backdrop itself closes the
    // dialog: presses on the panel bubble up here too.
    let backdropNode: Container | undefined
    const press = usePress({
      disabled: () => !props.open || !props.backdrop || !props.closeOnBackdrop,
      // A sweep or drag across the backdrop is not a press outside.
      cancelAfter: 0.01,
      onPress: () => close('backdrop'),
    })
    const onBackdropDown = (event: ControlPointerEvent) => {
      if (event.object === backdropNode) press.onPointerDown(event)
    }

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        const pixelSize = pixelSizeAt(distance())
        const size = props.backdrop ? BACKDROP_SIZE / pixelSize : undefined
        return {
          pixelSize,
          display: props.open ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          ...(props.backdrop
            ? {
                width: size,
                height: size,
                backgroundColor: t.colors.scrim,
                ...press,
                onPointerDown: onBackdropDown,
              }
            : {}),
        }
      },
    )
    backdropNode = node
    node.name = 'backdrop'

    // Open in front of the viewer, level with their eyes, facing them.
    const head = new Vector3()
    const forward = new Vector3()
    const place = () => {
      if (!view) {
        if (props.position) node.position.set(...props.position)
        return
      }
      view.headPosition(head)
      const p = new Vector3()
      if (props.position) {
        p.set(...props.position)
      } else {
        view.headDirection(forward)
        forward.y = 0
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
        p.copy(head).addScaledVector(forward.normalize(), distance())
      }
      const local = node.parent ? node.parent.worldToLocal(p.clone()) : p
      const localHead = node.parent ? node.parent.worldToLocal(head.clone()) : head
      node.position.copy(local)
      node.rotation.set(0, Math.atan2(localHead.x - local.x, localHead.z - local.z), 0)
    }
    watch(
      () => props.open,
      (open) => {
        if (open) {
          depth.value = modalStack.value.filter((n) => n !== node).length
          openModal(node)
        } else {
          closeModal(node)
        }
      },
      { immediate: true },
    )
    onBeforeUnmount(() => closeModal(node))

    watch(
      () => [props.open, props.position?.join(), props.distance] as const,
      ([open]) => open && place(),
      { immediate: true, flush: 'post' },
    )

    const onKey = (event: KeyboardEvent) => {
      // One Escape, one dialog: the topmost.
      if (event.key === 'Escape' && props.closeOnEscape && modalStack.value.at(-1) === node) close('escape')
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey)
      onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
    }

    return () => {
      const title = slots.title?.() ?? (props.title != null ? [h(XrText, { variant: 'title', text: props.title })] : [])
      const header =
        title.length || props.closable
          ? h(XrBox, { direction: 'row', align: 'center', justify: 'space-between', gap: 4, ui: { width: '100%' } }, () => [
              h(XrBox, { grow: 1 }, () => title),
              ...(props.closable
                ? [h(XrButton, { name: 'close', variant: 'ghost', size: 'sm', label: '×', onClick: () => close('button') })]
                : []),
            ])
          : null
      const actions = slots.actions
        ? h(XrBox, { direction: 'row', justify: 'flex-end', gap: 3, ui: { width: '100%' } }, () => slots.actions!())
        : null
      const panel = h(
        XrPanel,
        { name: 'dialog', width: props.width, variant: 'raised', ui: { ...props.ui } },
        () => [header, slots.default?.(), actions].filter((c) => c != null),
      )
      // `position` / `rotation` are set by `place` on open, not through attrs.
      return render(panel)
    }
  },
})
