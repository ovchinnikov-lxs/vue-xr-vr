import { defineComponent, h, inject, ref, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { Vector3 } from 'three'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { XR_VIEW } from '../runtime/context'
import { layoutProps } from '../runtime/layout'
import { useChildNode, useUikitNode } from '../runtime/node'
import { usePress, type ControlPointerEvent } from '../runtime/press'
import { XrPanel } from './XrPanel'

type Vec3 = [number, number, number]

/**
 * A panel you can pick up and put somewhere else, like a window in the
 * Quest home: a handle bar under it moves it.
 *
 * ```vue
 * <XrWindow v-model:position="where" :width="480">...</XrWindow>
 * ```
 *
 * Grab the handle with a controller ray (trigger), a hand ray or a pinch
 * on the handle itself, or the mouse; the window follows and turns to face
 * you. Without `v-model:position` it still moves and keeps its new place.
 * Place it at the top level of the scene (not inside another panel).
 */
export const XrWindow = defineComponent({
  name: 'XrWindow',
  inheritAttrs: false,
  props: {
    ...layoutProps,
    /** Where the window is, in scene metres. Use with `v-model:position` to keep where the user put it. */
    position: { type: Array as unknown as PropType<Vec3>, default: () => [0, 1.4, -1] },
    /** Background: `surface`, `raised` or `sunken` (see XrPanel). */
    variant: { type: String as PropType<'surface' | 'raised' | 'sunken'>, default: 'surface' },
    /** Reading distance in metres. Scales the window to keep the same angular size. */
    distance: Number,
    /** Lit material preset for the background (see XrPanel). */
    material: String as PropType<'glass' | 'metal' | 'plastic'>,
    /** Show the handle and allow moving. */
    movable: { type: Boolean, default: true },
  },
  emits: {
    /** Where the window was put down (on release). */
    'update:position': (_position: Vec3) => true,
  },
  setup(props, { slots, emit, attrs }) {
    const theme = useXrTheme()
    const view = inject(XR_VIEW, undefined)

    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          pixelSize: pixelSizeAt(props.distance ?? t.viewingDistance),
          flexDirection: 'column',
          alignItems: 'center',
          gap: t.space[3],
        }
      },
    )

    // Where the window was moved to by hand. Kept outside Vue's reactivity:
    // it is applied to the object directly every move, and re-renders read it.
    let placed: Vec3 | undefined
    let yaw: number | undefined
    // The `position` prop as last seen, by value: a template literal makes a
    // new array on every parent render, which must not undo a move.
    let seen: Vec3 = [...props.position]
    const grabOffset = new Vector3()
    const point = new Vector3()
    const head = new Vector3()
    const dragging = ref(false)

    const toParent = (world: Vector3) => (node.parent ? node.parent.worldToLocal(world) : world)

    const onDown = (event: ControlPointerEvent) => {
      if (!event.point) return
      dragging.value = true
      grabOffset.copy(node.position).sub(toParent(point.copy(event.point)))
    }
    const onMove = (event: ControlPointerEvent) => {
      if (!event.point) return
      // A ray keeps its grab point at the same distance along the ray (see
      // @pmndrs/pointer-events pointer capture), so the window swings with
      // the controller; a hand or the mouse carries it along directly.
      const p = toParent(point.copy(event.point)).add(grabOffset)
      node.position.copy(p)
      placed = [p.x, p.y, p.z]
      if (view) {
        // Turn to face the viewer, around the vertical axis only.
        toParent(view.headPosition(head))
        yaw = Math.atan2(head.x - p.x, head.z - p.z)
        node.rotation.set(0, yaw, 0)
      }
    }
    const onRelease = () => {
      dragging.value = false
      if (placed) emit('update:position', [...placed])
    }

    return () => {
      // A different `position` from the parent wins over where it was dragged.
      if (props.position.some((v, i) => v !== seen[i])) {
        seen = [...props.position]
        if (!placed || placed.some((v, i) => v !== seen[i])) placed = undefined
      }
      const { position: _p, movable: _m, distance: _d, ...panelProps } = props
      const children = [h(XrPanel, panelProps, slots)]
      if (props.movable) children.push(h(XrWindowHandle, { dragging: dragging.value, onDown, onMove, onRelease }))
      return render(children, {
        ...attrs,
        position: placed ?? props.position,
        ...(yaw != null ? { rotation: [0, yaw, 0] } : {}),
      })
    }
  },
})

/** The bar under a window. Its target is much larger than the bar itself. */
const XrWindowHandle = defineComponent({
  name: 'XrWindowHandle',
  props: {
    dragging: Boolean,
    onDown: { type: Function as PropType<(e: ControlPointerEvent) => void>, required: true },
    onMove: { type: Function as PropType<(e: ControlPointerEvent) => void>, required: true },
    onRelease: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const theme = useXrTheme()
    const press = usePress({
      disabled: () => false,
      onDown: (e) => props.onDown(e),
      onMove: (e) => props.onMove(e),
      onRelease: () => props.onRelease(),
    })
    const { node, render } = useUikitNode(
      (initial) => new Container(initial),
      () => {
        const t = theme.value
        return {
          width: 160,
          height: t.interaction.minTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radius.full,
          cursor: props.dragging ? 'grabbing' : 'grab',
          hover: { backgroundColor: t.colors.ghostHover },
          // UI ignores grab pointers (see runtime/node.ts), but a handle is
          // exactly what a pinch should grab.
          pointerEventsType: 'all',
          ...press,
        }
      },
    )
    node.name = 'handle'
    useChildNode(node, () => {
      const t = theme.value
      const c = t.colors
      return {
        width: props.dragging ? 120 : 96,
        height: 10,
        borderRadius: t.radius.full,
        backgroundColor: props.dragging ? c.primary : c.textMuted,
        backgroundOpacity: props.dragging ? 1 : 0.6,
      }
    })
    return () => render()
  },
})
