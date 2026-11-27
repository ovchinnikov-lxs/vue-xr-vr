import { Matrix4, Vector3 } from 'three'
import type { XRStore, XrView } from './context'
import { spaceToWorld } from './xr-pose'

const joint = new Matrix4()
const knuckle = new Vector3()
const head = new Vector3()
const toHead = new Vector3()

/** Where a tracked hand's palm is and which way it faces, in world space. */
export interface PalmPose {
  /** Between the wrist and the middle knuckle. */
  center: Vector3
  /** Out of the palm. */
  normal: Vector3
  /** Degrees between the palm's normal and the direction to the head: 0 = facing the eyes. */
  angleToHead: number
}

/**
 * The palm of `hand` this frame, or undefined when it is not tracked.
 * `frame` must be the current XRFrame (or an input event's frame).
 */
export function palmPose(store: XRStore, frame: XRFrame, hand: XRHand, view: XrView, out: PalmPose): PalmPose | undefined {
  const wristSpace = hand.get('wrist')
  const knuckleSpace = hand.get('middle-finger-metacarpal')
  if (!wristSpace || !knuckleSpace || !spaceToWorld(store, frame, wristSpace, joint)) return undefined
  out.center.setFromMatrixPosition(joint)
  // Joint spaces: -y points out of the palm (WebXR Hand Input).
  out.normal.set(0, -1, 0).transformDirection(joint)
  if (!spaceToWorld(store, frame, knuckleSpace, joint)) return undefined
  knuckle.setFromMatrixPosition(joint)
  out.center.add(knuckle).multiplyScalar(0.5)
  view.headPosition(head)
  toHead.copy(head).sub(out.center).normalize()
  out.angleToHead = (Math.acos(Math.min(1, Math.max(-1, out.normal.dot(toHead)))) * 180) / Math.PI
  return out
}

export const createPalmPose = (): PalmPose => ({ center: new Vector3(), normal: new Vector3(), angleToHead: 180 })
