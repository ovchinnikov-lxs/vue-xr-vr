import { computed, defineComponent, h, inject, markRaw, onBeforeUnmount, provide, ref, watch, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { BackSide, Color, Mesh, MeshBasicMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from 'three'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { PRESS_HUB, RENDER_LAYER, SURFACE_HOST, XR_VIEW } from '../runtime/context'
import { useXrFrame } from '../composables/useXrFrame'
import { closeModal, modalLayers, modalStack, openModal } from '../runtime/modal'
import { useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { XrBox } from './XrBox'
import { XrButton } from './XrButton'
import { XrPanel } from './XrPanel'
import { XrText } from './XrText'

type Vec3 = [number, number, number]

/** Radius of the backdrop sphere around the head, in metres: well inside the camera's far plane. */
const SHELL_RADIUS = 5
const SHELL_GEOMETRY = new SphereGeometry(SHELL_RADIUS, 32, 16)
/** The backdrop fades in over this long. */
const FADE_MS = 150
/** renderOrder / pointerEventsOrder of the first dialog's backdrop; each stacked dialog goes LAYER_STEP higher. */
const DIALOG_LAYER = 100
const LAYER_STEP = 10

/** Stacking depth of each open dialog. */
const dialogDepth = new WeakMap<object, number>()

/** A CSS colour (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`, a name) as a three.js colour and an alpha. */
function parseColor(css: string): { color: Color; alpha: number } {
  const rgba = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(css.trim())
  if (rgba) {
    const a = rgba[4]
    const alpha = a == null ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)
    return { color: new Color().setRGB(+rgba[1]! / 255, +rgba[2]! / 255, +rgba[3]! / 255, SRGBColorSpace), alpha }
  }
  return { color: new Color(css), alpha: 1 }
}
/**
 * Default distance as a share of the theme's viewing distance: a step in
 * front of the panels at reading distance, so it reads as on top of them.
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
 * (mouse, controller ray, pinch). The backdrop dims the whole scene around
 * the viewer, wherever they look or walk, and takes every press that misses
 * the dialog, so nothing behind it can be used. Place it at the top level
 * of the scene (not inside another panel).
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

    // The backdrop: a sphere around the viewer's head, seen from inside,
    // drawn over everything but the dialog (no depth test) and taking every
    // ray that misses the dialog (a higher pointerEventsOrder than any UI).
    // It dims the whole scene, near or far, and there is nothing to walk
    // through: it moves with the head.
    const layer = computed(() => DIALOG_LAYER + LAYER_STEP * depth.value)
    const shell = markRaw(new Mesh(SHELL_GEOMETRY, new MeshBasicMaterial({ side: BackSide, transparent: true, depthTest: false, depthWrite: false })))
    shell.name = 'backdrop'
    // Rays only: a fingertip or a grab sphere is always "inside" it (its bounds hold the head).
    Object.assign(shell, { pointerEventsType: { deny: ['grab', 'touch'] } })
    let fade = 0
    const scrim = computed(() => parseColor(theme.value.colors.scrim))
    const ordered = shell as Mesh & { pointerEventsOrder?: number }
    watch(
      layer,
      (order) => {
        shell.renderOrder = order
        ordered.pointerEventsOrder = order
      },
      { immediate: true },
    )
    const press = usePress({
      disabled: () => !props.open || !props.backdrop || !props.closeOnBackdrop,
      // A sweep or drag across the backdrop is not a press outside.
      cancelAfter: SHELL_RADIUS * 0.02,
      onPress: () => close('backdrop'),
    })
    for (const [type, handler] of [
      ['pointerdown', press.onPointerDown],
      ['pointermove', press.onPointerMove],
      ['pointerup', press.onPointerUp],
      ['pointercancel', press.onPointerCancel],
    ] as const) {
      shell.addEventListener(type as never, ((event: ControlPointerEvent) => handler(event)) as never)
    }
    const presses = inject(PRESS_HUB, undefined)
    if (presses) onBeforeUnmount(presses.addRoot(shell))
    const shellHead = new Vector3()
    useXrFrame((delta) => {
      const show = props.open && props.backdrop
      const parent = node.parent
      if (!show || !parent) {
        fade = 0
        shell.removeFromParent()
        return
      }
      if (shell.parent !== parent) parent.add(shell)
      const { color, alpha } = scrim.value
      fade = Math.min(1, fade + delta / FADE_MS)
      const material = shell.material
      material.color.copy(color)
      material.opacity = alpha * fade
      if (view) view.headPosition(shellHead)
      shell.position.copy(parent.worldToLocal(shellHead))
    })
    onBeforeUnmount(() => {
      shell.removeFromParent()
      shell.material.dispose()
    })

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => ({
        pixelSize: pixelSizeAt(distance()),
        display: props.open ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        // Over the backdrop, in drawing and in hit tests. No depth test: it
        // wins every ray, so nothing nearer may hide it either (uikit still
        // orders its own parts).
        renderOrder: layer.value + 1,
        pointerEventsOrder: layer.value + 1,
        depthTest: false,
      }),
    )
    node.name = 'dialog-root'
    provide(RENDER_LAYER, computed(() => layer.value + 1))
    provide(SURFACE_HOST, node)

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
          // One above the topmost open dialog (not the count: close the lower
          // of two and reopen it, and it must still land on top).
          const below = modalStack.value.filter((n) => n !== node)
          depth.value = below.length === 0 ? 0 : Math.max(...below.map((n) => dialogDepth.get(n) ?? 0)) + 1
          dialogDepth.set(node, depth.value)
          modalLayers.set(node, layer.value + 1)
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
