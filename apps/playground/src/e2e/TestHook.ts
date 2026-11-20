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

    const eventLog: string[] = []

    const activeInput = (hand: 'left' | 'right') => {
      const d = device()
      const input = d.primaryInputMode === 'hand' ? d.hands[hand] : d.controllers[hand]
      if (!input) throw new Error(`No ${hand} ${d.primaryInputMode}`)
      return input
    }

    /**
     * World position of a hand's index fingertip, read from the joint space
     * that @pmndrs/xr's touch pointer follows (so it is exactly what the
     * pointer sees, a frame late).
     */
    const fingertipWorld = (hand: 'left' | 'right'): Vector3 => {
      const session = xr.store.value?.getState().session
      const source = session && [...session.inputSources].find((s) => s.hand && s.handedness === hand)
      const joint = source?.hand?.get('index-finger-tip')
      let found: Object3D | undefined
      tres.scene.value.traverse((o: Object3D) => {
        if ((o as { xrSpace?: unknown }).xrSpace === joint && o.visible) found = o
      })
      if (!joint || !found) throw new Error(`No tracked ${hand} fingertip`)
      found.updateWorldMatrix(true, false)
      return new Vector3().setFromMatrixPosition(found.matrixWorld)
    }

    // Resolves after `n` rendered frames (XR frames during a session).
    const waiters: Array<{ left: number; resolve: () => void }> = []
    const frameTimes: number[] = []
    let lastFrame: XRFrame | undefined
    useXrFrame((delta, frame) => {
      lastFrame = frame
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
      /** Switches the emulated headset between controllers and tracked hands. */
      async setInputMode(mode: 'controller' | 'hand') {
        device().primaryInputMode = mode
        // Input sources swap over a few frames; wait until both are tracked.
        const ready = () => {
          const session = xr.store.value?.getState().session
          const sources = session ? [...session.inputSources] : []
          if (mode === 'controller') return sources.filter((s) => !s.hand).length === 2
          try {
            fingertipWorld('left')
            fingertipWorld('right')
            return true
          } catch {
            return false
          }
        }
        for (let i = 0; i < 120 && !ready(); i++) await frames(1)
        if (!ready()) throw new Error(`Input did not switch to ${mode}`)
        await frames(2)
      },
      /** Moves a controller or hand in front of a label and aims its ray at it. */
      aim(hand: 'left' | 'right', label: string) {
        const target = worldCenter(targetFor(label))
        const input = activeInput(hand)
        const from = target.clone().add(new Vector3(hand === 'left' ? -0.15 : 0.15, -0.1, 0.4))
        const q = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(from, target, new Vector3(0, 1, 0)))
        input.position.set(from.x, from.y, from.z)
        input.quaternion.set(q.x, q.y, q.z, q.w)
      },
      /**
       * Pokes a label with the index fingertip: the hand starts 5 cm in front
       * of the button, pushes 1 cm into it, and pulls back out.
       */
      async poke(hand: 'left' | 'right', label: string) {
        const handInput = device().hands[hand]
        if (!handInput) throw new Error(`No ${hand} hand`)
        handInput.poseId = 'default'
        handInput.quaternion.set(0, 0, 0, 1)
        const target = worldCenter(targetFor(label))
        // Where the fingertip sits relative to the hand origin depends on the
        // pose, so measure it: move once, read the tip, then correct.
        const start = target.clone().add(new Vector3(0, 0, 0.05))
        handInput.position.set(start.x, start.y, start.z)
        await frames(2)
        const tipOffset = fingertipWorld(hand).sub(start)
        for (const depth of [0.05, 0.03, 0.01, 0, -0.005, -0.01, -0.01, 0, 0.02, 0.05]) {
          const p = target.clone().sub(tipOffset).add(new Vector3(0, 0, depth))
          handInput.position.set(p.x, p.y, p.z)
          await frames(1)
        }
      },
      /** Pinches a hand for one frame: the hand's equivalent of a trigger click. */
      async pinch(hand: 'left' | 'right') {
        const handInput = device().hands[hand]
        if (!handInput) throw new Error(`No ${hand} hand`)
        handInput.updatePinchValue(1)
        await frames(2)
        handInput.updatePinchValue(0)
        await frames(2)
      },
      exit: () => xr.exit(),
      /** Starts logging pointer events on a label's component, as "type:pointerType". */
      recordEvents(label: string) {
        const target = targetFor(label) as unknown as {
          addEventListener(type: string, listener: (e: { pointerType?: string }) => void): void
        }
        for (const type of ['pointerenter', 'pointerdown', 'pointerup', 'click', 'pointerleave']) {
          target.addEventListener(type, (e) => eventLog.push(`${type}:${e.pointerType}`))
        }
      },
      events: () => [...eventLog],
      frames,
      frameTime: () => frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, frameTimes.length),
      /** Pulls the trigger: a quick click by default, or held for `holdMs`. */
      async pullTrigger(hand: 'left' | 'right', holdMs = 0) {
        const controller = device().controllers[hand]
        if (!controller) throw new Error(`No ${hand} controller`)
        controller.updateButtonValue('trigger', 1)
        await frames(2)
        const until = performance.now() + holdMs
        while (performance.now() < until) await frames(1)
        controller.updateButtonValue('trigger', 0)
        await frames(2)
      },
    }
    return () => null
  },
})
