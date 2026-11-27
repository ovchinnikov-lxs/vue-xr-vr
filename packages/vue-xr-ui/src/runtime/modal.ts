import { shallowRef } from 'vue'
import type { Object3D } from 'three'
import { activeTextTarget, type TextTarget } from './text-target'

/**
 * Open modal dialogs, oldest first. While one is open, only what is inside
 * the topmost one may take text focus, and Escape is for the topmost only.
 * (One stack for the page: like `activeTextTarget`, text focus is global.)
 */
export const modalStack = shallowRef<readonly Object3D[]>([])

/**
 * The renderOrder / pointerEventsOrder each open dialog draws at, over its
 * backdrop. An XrKeyboard typing into a field inside the top dialog goes
 * above it, or the backdrop would swallow its rays.
 */
export const modalLayers = new WeakMap<Object3D, number>()

/** The layer of the topmost dialog, when the field being typed into is inside it. */
export function activeModalLayer(): number | undefined {
  const top = modalStack.value.at(-1)
  const target = activeTextTarget.value
  if (!top || !target?.node || !contains(top, target.node)) return undefined
  return modalLayers.get(top)
}

/** Per open dialog: the field to give focus back to when it closes. */
interface FocusReturn {
  target: TextTarget | undefined
  wasFocused: boolean
}
const returns = new Map<Object3D, FocusReturn>()

const contains = (ancestor: Object3D, node: Object3D) => {
  for (let o: Object3D | null = node; o; o = o.parent) if (o === ancestor) return true
  return false
}

/** Whether `node` may take focus now: no modal is open, or it is inside the topmost one. */
export function inTopModal(node: Object3D): boolean {
  const top = modalStack.value.at(-1)
  return !top || contains(top, node)
}

/** Laid out and shown: not in a closed dialog or a hidden tab. */
const isShown = (node: Object3D) => (node as { isVisible?: { value: boolean } }).isVisible?.value !== false

/**
 * Pushes a dialog. A text field outside it loses focus and stops being the
 * keyboard's target, until `closeModal` puts both back.
 */
export function openModal(node: Object3D) {
  const target = activeTextTarget.value
  if (!returns.has(node)) returns.set(node, { target, wasFocused: target?.focused?.() ?? false })
  modalStack.value = [...modalStack.value.filter((n) => n !== node), node]
  if (target?.node && !inTopModal(target.node)) {
    target.blur?.()
    activeTextTarget.value = undefined
  }
}

export function closeModal(node: Object3D) {
  const stack = modalStack.value
  const index = stack.indexOf(node)
  if (index < 0) return
  const saved = returns.get(node)
  returns.delete(node)
  modalStack.value = stack.filter((n) => n !== node)

  // A field inside the closing dialog must not keep typing while hidden.
  const active = activeTextTarget.value
  if (active?.node && contains(node, active.node)) {
    active.blur?.()
    activeTextTarget.value = undefined
  }

  // Closed from under another dialog: the one above inherits where focus goes back to.
  const above = stack[index + 1]
  if (above) {
    if (saved) returns.set(above, saved)
    return
  }
  const target = saved?.target
  if (!target?.node || !target.node.parent || contains(node, target.node) || !inTopModal(target.node)) return
  // Not into a field of another closed dialog (still in the scene, just hidden).
  if (!isShown(target.node)) return
  activeTextTarget.value = target
  if (saved?.wasFocused) target.focus?.()
}
