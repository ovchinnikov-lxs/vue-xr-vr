import { inject, onBeforeUnmount, type ShallowRef } from 'vue'
import { XR_PLANES } from '../runtime/context'
import type { XrPlane } from '../runtime/planes'

/**
 * The real surfaces the headset knows about in a session: walls, floor,
 * tables... from the room setup (WebXR plane detection). The list changes
 * when planes appear or go; each plane's `matrix`, `center` and `normal`
 * update in place every frame, so read them in `useXrFrame`. Empty outside
 * a session and on devices without plane detection.
 *
 * ```ts
 * const planes = useXrPlanes()
 * const tables = computed(() => planes.value.filter((p) => p.label === 'table'))
 * ```
 */
export function useXrPlanes(): Readonly<ShallowRef<readonly XrPlane[]>> {
  const tracker = inject(XR_PLANES, undefined)
  if (!tracker) throw new Error('[vue-xr-ui] useXrPlanes() must be used inside <XrScene>.')
  onBeforeUnmount(tracker.use())
  return tracker.planes
}
