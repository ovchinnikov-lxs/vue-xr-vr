import type { Matrix4 } from 'three'
import type { XRStore } from './context'

/**
 * World matrix of an XR space (a plane, an anchor, a hand joint) this frame:
 * its pose in the session's reference space, then the scene origin's
 * transform on top (@pmndrs/xr puts the reference space on the camera's
 * parent, usually the scene). False when it is not tracked right now.
 */
export function spaceToWorld(store: XRStore, frame: XRFrame, space: XRSpace, target: Matrix4): boolean {
  const { origin, originReferenceSpace } = store.getState()
  if (!originReferenceSpace) return false
  const pose = frame.getPose(space, originReferenceSpace)
  if (!pose) return false
  target.fromArray(pose.transform.matrix)
  if (origin) {
    origin.updateWorldMatrix(true, false)
    target.premultiply(origin.matrixWorld)
  }
  return true
}
