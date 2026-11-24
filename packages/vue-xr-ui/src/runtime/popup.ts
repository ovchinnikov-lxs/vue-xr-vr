import { Fragment, defineComponent, h, inject, markRaw, onBeforeUnmount, provide, type PropType } from 'vue'
import { Container, type Component as UikitComponent } from '@pmndrs/uikit'
import { Matrix4, Vector3 } from 'three'
import { FRAME_HUB, PRESS_HUB, UIKIT_PARENT } from './context'
import { ROOT_DEFAULTS } from './node'

const placement = new Matrix4()
const corner = new Vector3()
const normal = new Vector3()

/** The layout root a component is in: the top of its uikit parent chain. */
export function layoutRootOf(component: UikitComponent): UikitComponent {
  let node = component
  while (node.parentContainer.value) node = node.parentContainer.value
  return node
}

/**
 * A layout root of its own for a popup (XrSelect's list), kept glued under
 * or over `anchor` every frame. Being a separate root, it is not clipped by
 * a scrolling or `overflow: hidden` ancestor of the anchor, the way a child
 * would be.
 *
 * It is drawn after the UI around it (`renderOrder` 1), takes pointers first
 * where it overlaps it (`pointerEventsOrder` 1), and sits `lift` dmm towards
 * the viewer. Render the popup's content inside `<Portal>`.
 */
export function usePopupLayer(
  anchor: UikitComponent,
  options: { open: () => boolean; placement: () => 'top' | 'bottom'; gap: () => number; lift: () => number },
) {
  const frames = inject(FRAME_HUB, undefined)
  const presses = inject(PRESS_HUB, undefined)
  const root = markRaw(
    new Container({ ...ROOT_DEFAULTS, flexDirection: 'column', renderOrder: 1, pointerEventsOrder: 1, display: 'none' } as never),
  )
  let last = ''

  const follow = (delta: number) => {
    // Findable like the anchor: `scene.getObjectByName('<name>-popup')`.
    root.name = anchor.name ? `${anchor.name}-popup` : 'popup'
    const open = options.open()
    const base = layoutRootOf(anchor)
    const size = anchor.size.value
    const panel = anchor.globalPanelMatrix.value
    const parent = base.parent
    if (!open || !size || !panel || !parent) {
      if (last !== 'closed') root.setProperties({ display: 'none' } as never)
      last = 'closed'
      root.update(delta)
      return
    }
    if (root.parent !== parent) parent.add(root)
    const top = options.placement() === 'top'
    const pixelSize = (base.properties.value as { pixelSize?: number }).pixelSize ?? 0.01
    const gap = options.gap()
    // Only touch uikit properties when they change: a reset re-runs layout.
    const key = `${top}|${size[0]}|${pixelSize}|${gap}`
    if (key !== last) {
      root.setProperties({
        display: 'flex',
        width: size[0],
        pixelSize,
        anchorX: 'left',
        anchorY: top ? 'bottom' : 'top',
        paddingTop: top ? 0 : gap,
        paddingBottom: top ? gap : 0,
      } as never)
      last = key
    }
    // The anchor's panel corner in the parent's space: the base root's own
    // placement (uikit keeps the panel transform out of position/rotation)
    // times the anchor's panel, which maps a unit square onto it.
    placement.compose(base.position, base.quaternion, base.scale).multiply(panel)
    corner.set(-0.5, top ? 0.5 : -0.5, 0).applyMatrix4(placement)
    normal.set(0, 0, 1).applyQuaternion(base.quaternion).multiplyScalar(options.lift() * pixelSize * base.scale.z)
    root.position.copy(corner).add(normal)
    root.quaternion.copy(base.quaternion)
    root.scale.copy(base.scale)
    root.update(delta)
  }

  if (frames) onBeforeUnmount(frames.add(follow))
  if (presses) onBeforeUnmount(presses.addRoot(root))
  onBeforeUnmount(() => {
    root.parent?.remove(root)
    root.dispose()
  })

  /** Renders its slot into the popup root instead of the anchor's tree. */
  const Portal = defineComponent({
    name: 'XrPopupPortal',
    props: { root: { type: Object as PropType<UikitComponent>, required: true } },
    setup(props, { slots }) {
      provide(UIKIT_PARENT, props.root)
      return () => h(Fragment, null, slots.default?.())
    },
  })

  return { root, Portal }
}
