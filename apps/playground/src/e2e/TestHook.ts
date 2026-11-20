import { defineComponent } from 'vue'
import { useTres } from '@tresjs/core'
import { Matrix4, Quaternion, Vector3, type Object3D } from 'three'
import { Component as UikitComponent, Text } from '@pmndrs/uikit'
import { useXr, useXrFrame } from 'vue-xr-ui'

/**
 * Test-only bridge for the Playwright suite in `e2e/`. Mounted in dev builds
 * only (see App.vue). Exposes `window.__xrTest` with helpers to find UI by its
 * label, project it to screen pixels, and drive the IWER emulated headset.
 */
export default defineComponent({
  name: 'TestHook',
  setup() {
    const tres = useTres()
    const xr = useXr()

    const allTexts = (): Text[] => {
      const out: Text[] = []
      tres.scene.value.traverse((o: Object3D) => {
        if (o instanceof Text) out.push(o as Text)
      })
      return out
    }
    const textOf = (t: Text) => String((t.properties.value as { text?: unknown }).text ?? '')
    const findText = (label: string) => allTexts().find((t) => textOf(t) === label)

    /** The clickable component for a label: the text's parent if it is a uikit container. */
    const targetFor = (label: string): UikitComponent => {
      const text = findText(label)
      if (!text) throw new Error(`No text "${label}" in the scene`)
      return text.parentContainer.value ?? text
    }

    const rootOf = (c: UikitComponent): UikitComponent => {
      let node = c
      while (node.parentContainer.value) node = node.parentContainer.value
      return node
    }

    /** World-space centre of a uikit component's panel. */
    const worldCenter = (c: UikitComponent): Vector3 => {
      const panel = c.globalPanelMatrix.value
      if (!panel) throw new Error('Component has no layout yet')
      // uikit sets a root's own matrix to its panel transform (scaled to the
      // panel size), so build the root's placement from position/rotation/scale.
      const root = rootOf(c)
      root.parent?.updateWorldMatrix(true, false)
      const placement = new Matrix4().compose(root.position, root.quaternion, root.scale)
      if (root.parent) placement.premultiply(root.parent.matrixWorld)
      return new Vector3().applyMatrix4(placement.multiply(panel))
    }

    // Resolves after `n` rendered frames (XR frames during a session).
    const waiters: Array<{ left: number; resolve: () => void }> = []
    const frameTimes: number[] = []
    useXrFrame((delta) => {
      frameTimes.push(delta)
      if (frameTimes.length > 30) frameTimes.shift()
      for (const w of [...waiters]) if (--w.left <= 0) waiters.splice(waiters.indexOf(w), 1), w.resolve()
    })
    const frames = (n: number) => new Promise<void>((resolve) => waiters.push({ left: n, resolve }))

    const device = () => {
      const emulator = xr.store.value?.getState().emulator
      if (!emulator) throw new Error('Emulator is not running')
      return emulator
    }

    ;(window as unknown as { __xrTest: unknown }).__xrTest = {
      texts: () => allTexts().map(textOf),
      hasText: (label: string) => findText(label) != null,
      state: () => ({
        presenting: xr.isPresenting.value,
        mode: xr.mode.value,
        emulator: xr.store.value?.getState().emulator != null,
      }),
      size: (label: string) => targetFor(label).size.value ?? null,
      /** CSS pixel position of a label's component on the 2D canvas. */
      screenPoint(label: string) {
        const camera = tres.camera.value
        if (!camera) throw new Error('No camera')
        const p = worldCenter(targetFor(label)).project(camera)
        const rect = tres.renderer.domElement.getBoundingClientRect()
        return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height }
      },
      /** Moves an emulated controller in front of a label and aims its ray at it. */
      aimController(hand: 'left' | 'right', label: string) {
        const target = worldCenter(targetFor(label))
        const controller = device().controllers[hand]
        if (!controller) throw new Error(`No ${hand} controller`)
        const from = target.clone().add(new Vector3(hand === 'left' ? -0.15 : 0.15, -0.1, 0.4))
        const q = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(from, target, new Vector3(0, 1, 0)))
        controller.position.set(from.x, from.y, from.z)
        controller.quaternion.set(q.x, q.y, q.z, q.w)
      },
      exit: () => xr.exit(),
      frames,
      frameTime: () => frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, frameTimes.length),
      /** Pulls the trigger for one frame: a quick click, as a person would. */
      async pullTrigger(hand: 'left' | 'right') {
        const controller = device().controllers[hand]
        if (!controller) throw new Error(`No ${hand} controller`)
        controller.updateButtonValue('trigger', 1)
        await frames(2)
        controller.updateButtonValue('trigger', 0)
        await frames(2)
      },
    }
    return () => null
  },
})
