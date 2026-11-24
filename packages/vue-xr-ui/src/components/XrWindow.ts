import { defineComponent, h, inject, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { Container } from '@pmndrs/uikit'
import { Quaternion, Vector3 } from 'three'
import { pixelSizeAt } from '@vue-xr-ui/tokens'
import { useXrTheme } from '../composables/useXrTheme'
import { useXrAnchor } from '../composables/useXrAnchor'
import { useXrFrame } from '../composables/useXrFrame'
import { XR_PLANES, XR_VIEW } from '../runtime/context'
import { snapToPlanes, type XrSnapTarget } from '../runtime/planes'
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
    /**
     * Stick to real surfaces while it is carried (passthrough on a Quest 3,
     * from the room setup): `true` for walls and tables, or a list of plane
     * labels (`['wall', 'window', 'table']`). On a wall it lies flat, facing
     * into the room; on a table it stands on its bottom edge, facing you.
     */
    snap: { type: [Boolean, Array] as PropType<XrSnapTarget>, default: false },
    /** How close, in metres, the window must come to a surface to stick to it. */
    snapDistance: { type: Number, default: 0.15 },
    /**
     * Keep the window where the user puts it down, under this name, across
     * sessions and reloads: a persistent WebXR anchor on a Quest, the pose in
     * the floor space elsewhere. It wins over `position` once placed. Set it
     * once; `useXrAnchor(name).forget()` drops the saved place.
     */
    anchor: String,
  },
  emits: {
    /** Where the window was put down (on release). */
    'update:position': (_position: Vec3) => true,
    /** The window stuck to a surface (its label: `wall`, `table`...) or came off it (`null`), while carried. */
    snap: (_label: string | null) => true,
    /** The window was put down: its world position and its rotation around the vertical axis, in radians. */
    place: (_placement: { position: Vec3; yaw: number }) => true,
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
    const toWorld = (local: Vector3) => (node.parent ? node.parent.localToWorld(local) : local)

    // Planes are tracked only while some window wants to snap.
    const planeTracker = inject(XR_PLANES, undefined)
    let releasePlanes: (() => void) | undefined
    watch(
      () => props.snap !== false && (props.snap === true || props.snap.length > 0),
      (on) => {
        releasePlanes?.()
        releasePlanes = on ? planeTracker?.use() : undefined
      },
      { immediate: true },
    )
    onBeforeUnmount(() => releasePlanes?.())
    let snapped: string | null = null
    let moved = false
    const world = new Vector3()

    // An anchored window follows its anchor whenever it is not being carried.
    const anchor = props.anchor ? useXrAnchor(props.anchor) : undefined
    const anchorPosition = new Vector3()
    const anchorRotation = new Quaternion()
    const facing = new Vector3()
    if (anchor) {
      useXrFrame(() => {
        if (!anchor.anchored.value || dragging.value) return
        anchor.matrix.decompose(anchorPosition, anchorRotation, facing)
        const p = toParent(anchorPosition)
        facing.set(0, 0, 1).applyQuaternion(anchorRotation)
        yaw = Math.atan2(facing.x, facing.z)
        node.position.copy(p)
        node.rotation.set(0, yaw, 0)
        placed = [p.x, p.y, p.z]
      })
    }

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
      let stuck: ReturnType<typeof snapToPlanes>
      if (view && planeTracker && releasePlanes && planeTracker.planes.value.length > 0) {
        const halfHeight = ((node.size.value?.[1] ?? 0) * pixelSizeAt(props.distance ?? theme.value.viewingDistance)) / 2
        stuck = snapToPlanes(toWorld(world.copy(p)), planeTracker.planes.value, props.snap, props.snapDistance, halfHeight, view.headPosition(head))
      }
      const label = stuck ? stuck.plane.label || stuck.plane.orientation : null
      if (label !== snapped) {
        snapped = label
        emit('snap', label)
      }
      if (stuck) {
        // Yaw is in world space; assumes an unrotated parent, like the facing below.
        p.copy(toParent(world.copy(stuck.position)))
        yaw = stuck.yaw
        node.rotation.set(0, yaw, 0)
      } else if (view) {
        // Turn to face the viewer, around the vertical axis only.
        toParent(view.headPosition(head))
        yaw = Math.atan2(head.x - p.x, head.z - p.z)
        node.rotation.set(0, yaw, 0)
      }
      node.position.copy(p)
      placed = [p.x, p.y, p.z]
      moved = true
    }
    const onRelease = () => {
      dragging.value = false
      // A tap on the handle is not a move: do not re-place (or re-anchor) it.
      if (!placed || !moved) return
      moved = false
      emit('update:position', [...placed])
      node.getWorldPosition(world)
      emit('place', { position: [world.x, world.y, world.z], yaw: yaw ?? 0 })
      if (anchor) void anchor.place(world.clone(), new Quaternion().setFromAxisAngle(facing.set(0, 1, 0), yaw ?? 0))
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
