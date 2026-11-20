import { Matrix4, Plane, Ray, Vector3 } from 'three'

/** The parts of a @pmndrs/pointer-events event that controls use. */
export interface ControlPointerEvent {
  pointerId?: number
  point?: Vector3
  pointOnFace?: Vector3
  pointerPosition?: Vector3
  details?: { type?: string }
  object?: { setPointerCapture?(id: number): void }
}

/**
 * Press handling shared by every pressable control.
 *
 * A press is a down then an up from the same pointer, however long it is
 * held, like a DOM click. (@pmndrs/pointer-events drops its own `click`
 * after 300 ms, which loses slow pokes and held triggers.) The pointer is
 * captured on down, as DOM does for touch: pressing sinks the control, which
 * can move it out from under a ray or fingertip for a frame, and the release
 * must still land here.
 */
export function usePress(options: {
  disabled: () => boolean
  /**
   * Cancels the press once the pointer travels this far (metres) from where
   * it went down: inside a scrolling list, a drag scrolls and must not also
   * select the item it started on.
   */
  cancelAfter?: number
  onDown?: (event: ControlPointerEvent) => void
  onMove?: (event: ControlPointerEvent) => void
  onPress?: (event: ControlPointerEvent) => void
  onRelease?: (event: ControlPointerEvent) => void
}) {
  /** Pointers that went down on this control and have not been released, with where they went down. */
  const pressed = new Map<number, Vector3 | undefined>()
  return {
    onPointerDown(event: ControlPointerEvent) {
      if (options.disabled() || event.pointerId == null) return
      pressed.set(event.pointerId, surfacePoint(event)?.clone())
      event.object?.setPointerCapture?.(event.pointerId)
      options.onDown?.(event)
    },
    onPointerMove(event: ControlPointerEvent) {
      if (event.pointerId == null || !pressed.has(event.pointerId) || options.disabled()) return
      const start = pressed.get(event.pointerId)
      const now = surfacePoint(event)
      if (options.cancelAfter != null && start && now && start.distanceTo(now) > options.cancelAfter) {
        pressed.delete(event.pointerId)
        return
      }
      options.onMove?.(event)
    },
    onPointerUp(event: ControlPointerEvent) {
      if (event.pointerId == null || !pressed.has(event.pointerId)) return
      pressed.delete(event.pointerId)
      options.onRelease?.(event)
      if (!options.disabled()) options.onPress?.(event)
    },
  }
}

/**
 * Where a pointer touches the surface it hit. For a fingertip pushing into
 * a control, `point` follows the finger in depth; travel along the surface
 * is what tells a tap from a drag.
 */
function surfacePoint(event: ControlPointerEvent): Vector3 | undefined {
  return event.pointOnFace ?? event.point
}

const inverse = new Matrix4()
const local = new Vector3()
const plane = new Plane()
const ray = new Ray()
const normal = new Vector3()
const xAxis = new Vector3()
const yAxis = new Vector3()
const origin = new Vector3()

/**
 * Where a pointer falls across a uikit component, from 0 (left edge) to 1
 * (right edge), clamped. Undefined if it cannot tell.
 *
 * Rays (controller, pinch, mouse) are intersected with the component's own
 * plane. While a pointer is captured, @pmndrs/pointer-events reports a ray's
 * `point` at the original hit distance, which curves away from the panel as
 * the ray sweeps and makes a slider lag behind. A fingertip is projected
 * onto the panel (`pointOnFace`).
 */
export function fractionAlong(
  component: { matrixWorld: Matrix4; updateWorldMatrix(parents: boolean, children: boolean): void },
  event: ControlPointerEvent,
): number | undefined {
  component.updateWorldMatrix(true, false)
  // A uikit component's world matrix maps a unit square centred on the
  // origin onto its panel.
  const m = component.matrixWorld
  let hit: Vector3 | undefined = event.pointOnFace ?? event.point
  const type = event.details?.type
  if ((type === 'ray' || type === 'screen-ray') && event.point && event.pointerPosition) {
    ray.origin.copy(event.pointerPosition)
    ray.direction.copy(event.point).sub(event.pointerPosition).normalize()
    // From the panel's own axes: its z column says nothing reliable (a flat panel may have no depth scale).
    m.extractBasis(xAxis, yAxis, normal)
    normal.crossVectors(xAxis, yAxis).normalize()
    plane.setFromNormalAndCoplanarPoint(normal, origin.setFromMatrixPosition(m))
    hit = ray.intersectPlane(plane, local) ?? hit
  }
  if (!hit) return undefined
  local.copy(hit).applyMatrix4(inverse.copy(m).invert())
  return Math.min(1, Math.max(0, local.x + 0.5))
}
