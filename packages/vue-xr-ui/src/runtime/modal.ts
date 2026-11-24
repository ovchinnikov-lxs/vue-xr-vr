import { shallowRef } from 'vue'
import type { Object3D } from 'three'
import { activeTextTarget, type TextTarget } from './text-target'

/**
 * Open modal dialogs, oldest first. While one is open, only what is inside
 * the topmost one may take text focus, and Escape is for the topmost only.
 */
export const modalStack = shallowRef<readonly Object3D[]>([])

const contains = (ancestor: Object3D, node: Object3D) => {
  for (let o: Object3D | null = node; o; o = o.parent) if (o === ancestor) return true
  return false
}

/** Whether `node` may take focus now: no modal is open, or it is inside the topmost one. */
export function inTopModal(node: Object3D): boolean {
  const top = modalStack.value.at(-1)
  return !top || contains(top, node)
}

/** What a dialog remembers to give focus back on close. */
export interface FocusReturn {
  target: TextTarget | undefined
  wasFocused: boolean
}

/**
 * Pushes a dialog. A text field outside it loses focus and stops being the
 * keyboard's target; the returned value puts both back on `closeModal`.
 */
export function openModal(node: Object3D): FocusReturn {
  const target = activeTextTarget.value
  const saved = { target, wasFocused: target?.focused?.() ?? false }
  modalStack.value = [...modalStack.value.filter((n) => n !== node), node]
  if (target?.node && !inTopModal(target.node)) {
    target.blur?.()
    activeTextTarget.value = undefined
  }
  return saved
}

export function closeModal(node: Object3D, saved: FocusReturn | undefined) {
  if (!modalStack.value.includes(node)) return
  modalStack.value = modalStack.value.filter((n) => n !== node)
  const target = saved?.target
  // Only back to a field that is still there and allowed (another modal may be on top).
  if (!target?.node || !target.node.parent || !inTopModal(target.node)) return
  activeTextTarget.value = target
  if (saved?.wasFocused) target.focus?.()
}
