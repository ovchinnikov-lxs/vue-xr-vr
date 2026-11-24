import { defineComponent, h, shallowRef, type PropType } from 'vue'
import { Object3D, Quaternion, Vector3 } from 'three'
import { useXrAnchor } from '../composables/useXrAnchor'
import { useXrFrame } from '../composables/useXrFrame'

type Vec3 = [number, number, number]

const position = new Vector3()
const quaternion = new Quaternion()
const scale = new Vector3()
const parentRotation = new Quaternion()

/**
 * Keeps what it wraps at a spot in the room, across sessions and reloads:
 * the dashboard stays on the kitchen wall. Until something is placed under
 * its `id`, the content sits at `position`.
 *
 * ```vue
 * <XrAnchor id="dashboard" :position="[0, 1.4, -1]" v-slot="{ place, anchored }">
 *   <XrPanel :width="400">
 *     <XrButton @click="place()">{{ anchored ? 'Move here' : 'Pin here' }}</XrButton>
 *   </XrPanel>
 * </XrAnchor>
 * ```
 *
 * `place()` anchors it where it is now; `place(position, quaternion)`
 * somewhere else (world space). `forget()` drops the saved spot. For a
 * window the user carries, use `<XrWindow anchor="id">` instead: it anchors
 * where it is put down.
 */
export const XrAnchor = defineComponent({
  name: 'XrAnchor',
  inheritAttrs: false,
  props: {
    /** Name the spot is saved under (in localStorage, and as the headset's persistent anchor). */
    id: { type: String, required: true },
    /** Where the content is until it has been placed, in scene metres. */
    position: { type: Array as unknown as PropType<Vec3>, default: () => [0, 0, 0] },
  },
  emits: {
    /** It was anchored: a spot was saved with `place`. */
    place: () => true,
    /** The saved spot was dropped with `forget`. */
    forget: () => true,
  },
  setup(props, { slots, attrs, emit, expose }) {
    const anchor = useXrAnchor(() => props.id)
    const group = shallowRef<Object3D>()

    useXrFrame(() => {
      const object = group.value
      if (!object) return
      if (!anchor.anchored.value) {
        object.position.set(...props.position)
        object.quaternion.identity()
        return
      }
      anchor.matrix.decompose(position, quaternion, scale)
      if (object.parent) {
        object.parent.updateWorldMatrix(true, false)
        object.parent.worldToLocal(position)
        quaternion.premultiply(object.parent.getWorldQuaternion(parentRotation).invert())
      }
      object.position.copy(position)
      object.quaternion.copy(quaternion)
    })

    const place = async (at?: Vector3, rotation?: Quaternion) => {
      const object = group.value
      if (!object) return
      object.updateWorldMatrix(true, false)
      await anchor.place(at ?? object.getWorldPosition(new Vector3()), rotation ?? object.getWorldQuaternion(new Quaternion()))
      emit('place')
    }
    const forget = async () => {
      await anchor.forget()
      emit('forget')
    }
    expose({ place, forget, anchored: anchor.anchored })

    return () =>
      h('TresGroup', { ...attrs, ref: group }, slots.default?.({ place, forget, anchored: anchor.anchored.value, saved: anchor.saved.value }))
  },
})
