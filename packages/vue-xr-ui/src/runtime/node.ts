import { Comment, Fragment, Text, h, inject, markRaw, onBeforeUnmount, provide, useAttrs, watch, type Slots, type VNode, type VNodeChild } from 'vue'
import type { Component as UikitComponent } from '@pmndrs/uikit'
import { FRAME_HUB, UIKIT_PARENT } from './context'

type Properties = Record<string, unknown>

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
): { node: T; isRoot: boolean; render: (children?: VNodeChild) => VNode } {
  const parent = inject(UIKIT_PARENT, undefined)
  const isRoot = parent == null
  const attrs = useAttrs()
  const getProperties = () => properties({ isRoot })
  const node = markRaw(create(getProperties()))

  // The getter rebuilds the object whenever any reactive input changes.
  // resetProperties (not setProperties) so that removed keys are cleared too.
  watch(getProperties, (next) => node.resetProperties(next as never))

  provide(UIKIT_PARENT, node)

  if (isRoot) {
    const hub = inject(FRAME_HUB, undefined)
    if (!hub) throw new Error('[vue-xr-ui] vue-xr-ui components must be placed inside <XrScene>.')
    onBeforeUnmount(hub.add((delta) => node.update(delta)))
  } else {
    // Setup runs in template order, so siblings are added in the right order
    // on first mount. TODO: keep order for children inserted later (v-if, v-for).
    parent.add(node)
  }

  onBeforeUnmount(() => node.dispose())

  const render = (children?: VNodeChild) =>
    isRoot ? h('primitive', { ...attrs, object: node }, children as never) : h(Fragment, null, children as never)

  return { node, isRoot, render }
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
