import { toValue, type MaybeRefOrGetter } from 'vue'
import { useXr } from './useXr'
import { useXrFrame } from './useXrFrame'
import { createXrAnchor, type XrAnchorHandle } from '../runtime/anchors'

/**
 * A place in the room kept under an id, across sessions and page reloads:
 * a WebXR anchor where the headset has them (Quest: persistent anchors),
 * the pose in the floor space elsewhere. `matrix` is its world pose, valid
 * while `anchored` is true, updated every frame.
 *
 * ```ts
 * const lamp = useXrAnchor('lamp')
 * await lamp.place(position, quaternion) // world space
 * useXrFrame(() => lamp.anchored.value && mesh.matrix.copy(lamp.matrix))
 * ```
 *
 * `<XrAnchor>` and `<XrWindow anchor>` are built on it.
 */
export function useXrAnchor(id: MaybeRefOrGetter<string>): Omit<XrAnchorHandle, 'update'> {
  const handle = createXrAnchor(useXr(), () => toValue(id))
  useXrFrame((_, frame) => handle.update(frame))
  return handle
}
