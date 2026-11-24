import { defineComponent, h, inject, onBeforeUnmount, shallowRef, watch, type PropType } from 'vue'
import { Object3D, Vector3 } from 'three'
import { useXr } from '../composables/useXr'
import { useXrFrame } from '../composables/useXrFrame'
import { XR_VIEW } from '../runtime/context'

const head = new Vector3()
const forward = new Vector3()
const target = new Vector3()
const current = new Vector3()
const toContent = new Vector3()

/**
 * Keeps what it wraps in view: a HUD, a toast, a menu that should never get
 * lost behind the user. It sits `distance` metres in front of the viewer and
 * turns to face them.
 *
 * ```vue
 * <XrFollow :distance="0.8" :height="-0.15">
 *   <XrPanel :width="320">...</XrPanel>
 * </XrFollow>
 * ```
 *
 * Lazy by default, like the Quest system UI: it stays put while you look
 * around a little, and glides back in front of you once it drifts more than
 * `angle` degrees from where you look. It only follows turns and steps, not
 * nods: it stays level and keeps its height relative to your eyes.
 * Children are positioned relative to the follow point; a root panel inside
 * needs no `position`.
 */
export const XrFollow = defineComponent({
  name: 'XrFollow',
  inheritAttrs: false,
  props: {
    /** Distance in front of the viewer, in metres. */
    distance: { type: Number, default: 0.8 },
    /** Height relative to the viewer's eyes, in metres (negative is below). */
    height: { type: Number, default: -0.1 },
    /**
     * How far, in degrees, the content may drift from straight ahead before
     * it follows. `0` follows every turn (a head-locked HUD, but smoothed).
     */
    angle: { type: Number, default: 30 },
    /** How fast it catches up: the share of the remaining way covered per second, as an exponential rate. */
    speed: { type: Number, default: 4 },
    /** Follow the viewer. `false` leaves it where it is (pinned). */
    active: { type: Boolean, default: true },
    /** Turn to face the viewer (around the vertical axis). */
    face: { type: Boolean, default: true },
  },
  emits: {
    /** It started moving back in front of the viewer. */
    follow: () => true,
    /** It arrived and stopped. */
    settle: () => true,
  },
  setup(props, { slots, attrs, emit }) {
    const view = inject(XR_VIEW, undefined)
    if (!view) throw new Error('[vue-xr-ui] <XrFollow> must be placed inside <XrScene>.')
    const xr = useXr()
    const group = shallowRef<Object3D>()
    let moving = false
    // Jump straight in front on the first frame, on session start and end, and on a recentre.
    let snap = true
    watch(xr.isPresenting, () => (snap = true))
    onBeforeUnmount(view.onRecenter(() => (snap = true)))

    useXrFrame((delta) => {
      const object = group.value
      if (!object || !props.active) return
      view.headPosition(head)
      view.headDirection(forward)
      forward.y = 0
      // Looking straight up or down: no horizontal direction to follow.
      if (forward.lengthSq() < 1e-4) return
      forward.normalize()
      target.copy(forward).multiplyScalar(props.distance).add(head)
      target.y += props.height

      object.getWorldPosition(current)
      if (snap) {
        current.copy(target)
        snap = false
      } else {
        toContent.copy(current).sub(head)
        toContent.y = 0
        const off = toContent.lengthSq() < 1e-6 ? Math.PI : toContent.angleTo(forward)
        const far = current.distanceTo(target)
        if (!moving && (off > (props.angle * Math.PI) / 180 || far > props.distance * 0.75)) {
          moving = true
          emit('follow')
        }
        if (moving) {
          // Frame-rate independent smoothing; delta is in ms.
          current.lerp(target, 1 - Math.exp((-props.speed * delta) / 1000))
          if (current.distanceTo(target) < 0.005) {
            current.copy(target)
            moving = false
            emit('settle')
          }
        }
      }
      setWorldPosition(object, current)
      if (props.face) faceViewer(object, head)
    })

    return () => h('TresGroup', { ...attrs, ref: group }, slots.default?.())
  },
})

/**
 * Turns what it wraps to face the viewer every frame, like a label or a
 * name tag; it stays where it is. `axis="y"` (default) only turns it around
 * the vertical axis, so it stays upright; `axis="all"` also tilts it up or
 * down toward the eyes.
 *
 * ```vue
 * <XrBillboard :position="[1, 1.2, -2]">
 *   <XrPanel :width="200"><XrText>Lamp</XrText></XrPanel>
 * </XrBillboard>
 * ```
 */
export const XrBillboard = defineComponent({
  name: 'XrBillboard',
  inheritAttrs: false,
  props: {
    /** `y`: turn around the vertical axis only (stays upright). `all`: face the eyes exactly. */
    axis: { type: String as PropType<'y' | 'all'>, default: 'y' },
  },
  setup(props, { slots, attrs }) {
    const view = inject(XR_VIEW, undefined)
    if (!view) throw new Error('[vue-xr-ui] <XrBillboard> must be placed inside <XrScene>.')
    const group = shallowRef<Object3D>()
    useXrFrame(() => {
      const object = group.value
      if (!object) return
      view.headPosition(head)
      if (props.axis === 'y') faceViewer(object, head)
      else object.lookAt(head)
    })
    return () => h('TresGroup', { ...attrs, ref: group }, slots.default?.())
  },
})

function setWorldPosition(object: Object3D, world: Vector3) {
  const local = toContent.copy(world)
  if (object.parent) {
    object.parent.updateWorldMatrix(true, false)
    object.parent.worldToLocal(local)
  }
  object.position.copy(local)
}

/** Yaw only: +z of the object points at the viewer, seen from above. */
function faceViewer(object: Object3D, eye: Vector3) {
  object.getWorldPosition(current)
  // Local rotation: assumes an unrotated parent (the scene, a moved group).
  object.rotation.set(0, Math.atan2(eye.x - current.x, eye.z - current.z), 0)
}
