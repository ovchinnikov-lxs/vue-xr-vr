import { defineComponent, h, inject, ref, shallowRef, type PropType } from 'vue'
import { Matrix4, Object3D, Vector3 } from 'three'
import { useXr } from '../composables/useXr'
import { useXrFrame } from '../composables/useXrFrame'
import { XR_VIEW } from '../runtime/context'
import { spaceToWorld } from '../runtime/xr-pose'

type Vec3 = [number, number, number]

const joint = new Matrix4()
const wrist = new Vector3()
const knuckle = new Vector3()
const palm = new Vector3()
const normal = new Vector3()
const head = new Vector3()
const toHead = new Vector3()
const up = new Vector3(0, 1, 0)
const side = new Vector3()

/**
 * A menu on the wrist: it shows above your hand when you turn the palm
 * toward your face, and goes away when you turn it back, like the Quest
 * system menu. Poke it with the other hand's fingertip.
 *
 * ```vue
 * <XrHandMenu hand="left" @open="..." @close="...">
 *   <XrPanel :width="260">
 *     <XrButton @click="recenter">Recenter</XrButton>
 *   </XrPanel>
 * </XrHandMenu>
 * ```
 *
 * Only tracked hands open it (not controllers, not the mouse). The content
 * is mounted while the menu is open, so it costs nothing the rest of the
 * time; keep state that must survive in the parent.
 */
export const XrHandMenu = defineComponent({
  name: 'XrHandMenu',
  inheritAttrs: false,
  props: {
    /** Which hand carries the menu. The other one pokes it. */
    hand: { type: String as PropType<'left' | 'right'>, default: 'left' },
    /**
     * How far the palm may turn away from your eyes, in degrees, before the
     * menu closes. It opens 15 degrees inside that, so it does not flicker
     * at the edge.
     */
    angle: { type: Number, default: 50 },
    /**
     * Where the menu sits relative to the palm, in metres: `[side, up, out]`,
     * with `side` toward the thumb, `up` toward the sky and `out` along the
     * palm's normal.
     */
    offset: { type: Array as unknown as PropType<Vec3>, default: () => [0, 0.12, 0.04] },
  },
  emits: {
    /** The palm turned toward the face: the menu opened. */
    open: () => true,
    /** The palm turned away or the hand was lost: the menu closed. */
    close: () => true,
  },
  setup(props, { slots, attrs, emit }) {
    const xr = useXr()
    const view = inject(XR_VIEW, undefined)
    if (!view) throw new Error('[vue-xr-ui] <XrHandMenu> must be placed inside <XrScene>.')
    const group = shallowRef<Object3D>()
    const open = ref(false)
    const setOpen = (next: boolean) => {
      if (next === open.value) return
      open.value = next
      if (next) emit('open')
      else emit('close')
    }

    useXrFrame((_, frame) => {
      const store = xr.store.value
      const session = xr.session.value
      // A session tick without an XRFrame (window rAF, see planes.ts): skip.
      if (session && !frame) return
      const source = session && [...session.inputSources].find((s) => s.hand && s.handedness === props.hand)
      const hand = source?.hand
      const wristSpace = hand?.get('wrist')
      const knuckleSpace = hand?.get('middle-finger-metacarpal')
      if (!frame || !store || !wristSpace || !knuckleSpace || !spaceToWorld(store, frame, wristSpace, joint)) return setOpen(false)
      wrist.setFromMatrixPosition(joint)
      // Joint spaces: -y points out of the palm (WebXR Hand Input).
      normal.set(0, -1, 0).transformDirection(joint)
      if (!spaceToWorld(store, frame, knuckleSpace, joint)) return setOpen(false)
      knuckle.setFromMatrixPosition(joint)
      palm.addVectors(wrist, knuckle).multiplyScalar(0.5)

      view.headPosition(head)
      toHead.copy(head).sub(palm).normalize()
      const off = (Math.acos(Math.min(1, Math.max(-1, normal.dot(toHead)))) * 180) / Math.PI
      setOpen(open.value ? off < props.angle : off < props.angle - 15)
      const object = group.value
      if (!open.value || !object) return

      // Toward the thumb: left of the palm normal on a left hand, right on a right one.
      side.crossVectors(up, normal).normalize()
      if (props.hand === 'right') side.negate()
      const [x, y, z] = props.offset
      palm.addScaledVector(side, x).addScaledVector(up, y).addScaledVector(normal, z)
      if (object.parent) {
        object.parent.updateWorldMatrix(true, false)
        object.parent.worldToLocal(palm)
      }
      object.position.copy(palm)
      object.lookAt(head)
    })

    return () => h('TresGroup', { ...attrs, ref: group }, open.value ? slots.default?.() : undefined)
  },
})
