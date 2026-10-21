import { inject, onBeforeUnmount } from 'vue'
import { FRAME_HUB, type FrameCallback } from '../runtime/context'

/**
 * Runs `cb` every frame, both in the browser and inside an XR session.
 *
 * Prefer this over TresJS `useLoop()` for anything that must keep running
 * in the headset: TresJS drives its loop with window.requestAnimationFrame,
 * which the browser pauses during an immersive session.
 */
export function useXrFrame(cb: FrameCallback): void {
  const hub = inject(FRAME_HUB)
  if (!hub) throw new Error('[vue-xr-ui] useXrFrame() must be used inside <XrScene>.')
  onBeforeUnmount(hub.add(cb))
}
