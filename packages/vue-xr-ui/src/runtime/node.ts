import { Comment, Fragment, Text, h, inject, markRaw, onBeforeUnmount, provide, useAttrs, watch, type Slots, type VNode, type VNodeChild } from 'vue'
import { Container, type Component as UikitComponent } from '@pmndrs/uikit'
import { DoubleSide, MeshBasicMaterial } from 'three'
import { FRAME_HUB, PRESS_HUB, UIKIT_PARENT } from './context'
import { defaultFontFamilies } from './fonts'

/**
 * uikit's panel material, but drawn from both sides. uikit forces
 * `side = FrontSide` right after it creates a panel material, so the side
 * is pinned on the prototype and assignments are ignored.
 */
export class DoubleSidedPanelMaterial extends MeshBasicMaterial {}
Object.defineProperty(DoubleSidedPanelMaterial.prototype, 'side', {
  get: () => DoubleSide,
  set: () => {},
  configurable: true,
})

type Properties = Record<string, unknown>

/**
 * Defaults for every layout root, inherited by its whole tree.
 *
 * `pointerEventsType`: UI ignores grab pointers. A tracked hand carries a
 * grab pointer and a touch pointer on the same fingertip; when both hit a
 * button at the same distance the grab pointer wins, and a poke never
 * presses anything. Grabbing is for objects, not for buttons.
 *
 * `fontFamilies`: Inter with Cyrillic (see fonts.ts). A root can still set
 * its own through its properties.
 *
 * `panelMaterialClass`: the root's background (a window, a panel, a popup)
 * shows from behind too, as a plain plate, so UI does not vanish when you
 * walk around it. Not inherited: inner panels, text and icons stay
 * front-only, so nothing shows through mirrored.
 */
export const ROOT_DEFAULTS: Properties = {
  pointerEventsType: { deny: 'grab' },
  fontFamilies: defaultFontFamilies,
  panelMaterialClass: DoubleSidedPanelMaterial,
}

/**
 * Binds one uikit component to the lifetime of a Vue component.
 *
 * - A layout root (no uikit parent) is rendered through TresJS as
 *   `<primitive :object>`, so it lands in the three.js scene like any other
 *   Tres object, and receives attrs such as `position` and `rotation`. Its
 *   per-frame `update` (where yoga layout runs) is driven from <XrScene>.
 * - A nested node attaches itself to its parent uikit node directly and
 *   renders only its children. Going through TresJS here would break uikit:
 *   TresJS wraps primitives in a Proxy, so `child.parent` would become that
 *   Proxy instead of the parent component and uikit would treat every child
 *   as a separate root.
 *
 * Components using this must set `inheritAttrs: false`; `render` forwards
 * attrs to the root primitive itself.
 */
export function useUikitNode<T extends UikitComponent>(
  create: (initial: Properties) => T,
  properties: (ctx: { isRoot: boolean }) => Properties,
): { node: T; isRoot: boolean; render: (children?: VNodeChild, rootAttrs?: Record<string, unknown>) => VNode } {
  const parent = inject(UIKIT_PARENT, undefined)
  const isRoot = parent == null
  const attrs = useAttrs()
  const getProperties = () => (isRoot ? { ...ROOT_DEFAULTS, ...properties({ isRoot }) } : properties({ isRoot }))
  const node = markRaw(create(getProperties()))

  // The getter rebuilds the object whenever any reactive input changes.
  // resetProperties (not setProperties) so that removed keys are cleared too.
  watch(getProperties, (next) => node.resetProperties(next as never))

  // `name` works like on any three.js object: scene.getObjectByName(...).
  watch(() => attrs.name, (name) => (node.name = typeof name === 'string' ? name : ''), { immediate: true })

  provide(UIKIT_PARENT, node)

  if (isRoot) {
    const hub = inject(FRAME_HUB, undefined)
    if (!hub) throw new Error('[vue-xr-ui] vue-xr-ui components must be placed inside <XrScene>.')
    onBeforeUnmount(hub.add((delta) => node.update(delta)))
    const presses = inject(PRESS_HUB, undefined)
    if (presses) onBeforeUnmount(presses.addRoot(node))
  } else {
    // Setup runs in template order, so siblings are added in the right order
    // on first mount. TODO: keep order for children inserted later (v-if, v-for).
    parent.add(node)
  }

  onBeforeUnmount(() => node.dispose())

  // `rootAttrs` override attrs on the root primitive (a window moved by hand keeps its new place).
  const render = (children?: VNodeChild, rootAttrs?: Record<string, unknown>) =>
    isRoot ? h('primitive', { ...attrs, ...rootAttrs, object: node }, children as never) : h(Fragment, null, children as never)

  return { node, isRoot, render }
}

/**
 * A uikit container that is part of a control's own anatomy (a slider's
 * track, a toggle's thumb), created without a Vue component of its own.
 * Children are added in call order.
 */
export function useChildNode(parent: UikitComponent, properties: () => Properties): Container {
  const node = markRaw(new Container(properties() as never))
  watch(properties, (next) => node.resetProperties(next as never))
  parent.add(node)
  onBeforeUnmount(() => node.dispose())
  return node
}

/** Returns the slot's content as a string if it is plain text only, else undefined. */
export function slotText(slots: Slots): string | undefined {
  const nodes = slots.default?.()
  if (!nodes) return undefined
  let text = ''
  for (const vnode of flatten(nodes)) {
    if (vnode.type === Comment) continue
    if (vnode.type !== Text) return undefined
    text += String(vnode.children ?? '')
  }
  return text
}

function flatten(nodes: VNode[]): VNode[] {
  return nodes.flatMap((n) => (Array.isArray(n.children) && typeof n.type === 'symbol' ? flatten(n.children as VNode[]) : [n]))
}
