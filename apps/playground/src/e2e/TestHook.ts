import { defineComponent } from 'vue'
import { useTres } from '@tresjs/core'
import { Matrix4, Quaternion, Vector3, type Object3D, type WebGLRenderer } from 'three'
import { Component as UikitComponent, Input, Text } from '@pmndrs/uikit'
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

    /**
     * The component for a label: the text's parent if it is a uikit container.
     * `#name` finds a component by its three.js name (the `name` attr)
     * instead, and `#name.part` a named part inside it (a slider's `track`).
     */
    const targetFor = (label: string): UikitComponent => {
      if (label.startsWith('#')) {
        let found: Object3D | undefined = tres.scene.value
        for (const name of label.slice(1).split('.')) found = found?.getObjectByName(name)
        if (!(found instanceof UikitComponent)) throw new Error(`No component "${label}"`)
        return found as unknown as UikitComponent
      }
      const text = findText(label)
      if (!text) throw new Error(`No text "${label}" in the scene`)
      return text.parentContainer.value ?? text
    }

    const rootOf = (c: UikitComponent): UikitComponent => {
      let node = c
      while (node.parentContainer.value) node = node.parentContainer.value
      return node
    }

    /**
     * World-space point on a uikit component's panel, `fx` of the way from
     * its left edge (0) to its right edge (1), vertically centred.
     */
    const worldPoint = (c: UikitComponent, fx = 0.5): Vector3 => {
      const panel = c.globalPanelMatrix.value
      if (!panel) throw new Error('Component has no layout yet')
      // uikit sets a root's own matrix to its panel transform (scaled to the
      // panel size), so build the root's placement from position/rotation/scale.
      const root = rootOf(c)
      root.parent?.updateWorldMatrix(true, false)
      const placement = new Matrix4().compose(root.position, root.quaternion, root.scale)
      if (root.parent) placement.premultiply(root.parent.matrixWorld)
      // The panel matrix maps a unit square centred on the origin onto the panel.
      return new Vector3(fx - 0.5, 0, 0).applyMatrix4(placement.multiply(panel))
    }

    /** Moves a controller or hand in front of a point on a label and aims its ray at it. */
    const aim = (hand: 'left' | 'right', label: string, fx = 0.5) => {
      const target = worldPoint(targetFor(label), fx)
      const input = activeInput(hand)
      const from = target.clone().add(new Vector3(hand === 'left' ? -0.15 : 0.15, -0.1, 0.4))
      const q = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(from, target, new Vector3(0, 1, 0)))
      input.position.set(from.x, from.y, from.z)
      input.quaternion.set(q.x, q.y, q.z, q.w)
    }

    /**
     * Puts a hand in its default pose, palm down and pointing ahead, and
     * returns where its index fingertip sits relative to the hand origin.
     * Measured 30 cm in front of `near`, clear of the UI, or the fingertip
     * could press something on the way.
     */
    const measureFingertip = async (hand: 'left' | 'right', near: Vector3): Promise<Vector3> => {
      const handInput = device().hands[hand]
      if (!handInput) throw new Error(`No ${hand} hand`)
      handInput.poseId = 'default'
      handInput.quaternion.set(0, 0, 0, 1)
      const start = near.clone().add(new Vector3(0, 0, 0.3))
      handInput.position.set(start.x, start.y, start.z)
      // Joint poses reach the scene a frame or two later; wait until the tip settles.
      let tip = fingertipWorld(hand)
      for (let i = 0; i < 10; i++) {
        await frames(1)
        const next = fingertipWorld(hand)
        const settled = next.distanceTo(tip) < 0.0005
        tip = next
        if (settled) break
      }
      return tip.sub(start)
    }

    /**
     * Aims and waits until the ray is actually on the target (a pointerenter
     * on it). Right after a session starts, controllers take a few frames to
     * get their pointers, and a slow machine takes longer.
     */
    const aimUntilHovered = async (hand: 'left' | 'right', label: string, fx = 0.5) => {
      const target = targetFor(label) as unknown as {
        addEventListener(type: string, l: () => void): void
        removeEventListener(type: string, l: () => void): void
      }
      // Point away first, so that a ray already on the target enters it again.
      const input = activeInput(hand)
      input.position.set(0, -10, 0)
      await frames(2)
      let hovered = false
      const onEnter = () => (hovered = true)
      target.addEventListener('pointerenter', onEnter)
      try {
        aim(hand, label, fx)
        for (let i = 0; i < 60 && !hovered; i++) await frames(1)
      } finally {
        target.removeEventListener('pointerenter', onEnter)
      }
      if (!hovered) throw new Error(`The ${hand} ray never reached "${label}"`)
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
      /** Whether a label is laid out and shown: no ancestor has display: none. */
      isShown(label: string) {
        let node: UikitComponent | undefined
        try {
          node = label.startsWith('#') ? targetFor(label) : findText(label)
        } catch {
          return false
        }
        if (!node) return false
        for (; node; node = node.parentContainer.value) {
          if ((node.properties.value as { display?: string }).display === 'none') return false
        }
        return true
      },
      state: () => ({
        presenting: xr.isPresenting.value,
        mode: xr.mode.value,
        emulator: xr.store.value?.getState().emulator != null,
      }),
      /** What the renderer clears to, and whether the scene has a background (passthrough hides both). */
      renderState: () => ({ clearAlpha: (tres.renderer as unknown as WebGLRenderer).getClearAlpha(), background: tres.scene.value.background != null }),
      size: (label: string) => targetFor(label).size.value ?? null,
      /** The value of the text input inside a component (an <XrTextField>), and whether it has focus. */
      inputState: (label: string) => {
        let input: Input | undefined
        ;(targetFor(label) as unknown as Object3D).traverse((o) => {
          if (!input && o instanceof Input) input = o as Input
        })
        if (!input) throw new Error(`No input in "${label}"`)
        return { value: input.currentSignal.value, focused: input.hasFocus.value, selection: input.selectionRange.value }
      },
      /** A component's resolved background colour. */
      /** A uikit property of a label's component, as uikit resolved it (JSON-safe values only). */
      property: (label: string, key: string) => (targetFor(label).properties.value as Record<string, unknown>)[key] ?? null,
      background: (label: string) => String((targetFor(label).properties.value as { backgroundColor?: unknown }).backgroundColor ?? ''),
      /** CSS pixel position of a point on a label's component (see worldPoint) on the 2D canvas. */
      screenPoint(label: string, fx = 0.5) {
        const camera = tres.camera.value
        if (!camera) throw new Error('No camera')
        const p = worldPoint(targetFor(label), fx).project(camera)
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
      aim,
      aimUntilHovered,
      /** Aims a controller at `fromFx` across a label, holds the trigger, sweeps to `toFx`, releases. */
      async rayDrag(hand: 'left' | 'right', label: string, fromFx: number, toFx: number) {
        const controller = device().controllers[hand]
        if (!controller) throw new Error(`No ${hand} controller`)
        aim(hand, label, fromFx)
        await frames(3)
        controller.updateButtonValue('trigger', 1)
        await frames(2)
        for (let i = 1; i <= 8; i++) {
          aim(hand, label, fromFx + ((toFx - fromFx) * i) / 8)
          await frames(1)
        }
        // Rest on the target before letting go, as a person would.
        await frames(3)
        controller.updateButtonValue('trigger', 0)
        await frames(2)
      },
      /**
       * Pokes a label with the index fingertip: the hand starts 5 cm in front
       * of it at `fromFx`, pushes 5 mm in, slides to `toFx` (a tap when they
       * are equal), and pulls back out.
       */
      async poke(hand: 'left' | 'right', label: string, fromFx = 0.5, toFx = fromFx) {
        const handInput = device().hands[hand]
        if (!handInput) throw new Error(`No ${hand} hand`)
        const component = targetFor(label)
        const tipOffset = await measureFingertip(hand, worldPoint(component, fromFx))
        const steps: Array<[number, number]> = [
          ...[0.05, 0.03, 0.01, 0].map((d): [number, number] => [fromFx, d]),
          ...Array.from({ length: 8 }, (_, i): [number, number] => [fromFx + ((toFx - fromFx) * (i + 1)) / 8, -0.005]),
          ...[0, 0.02, 0.05].map((d): [number, number] => [toFx, d]),
        ]
        for (const [fx, depth] of steps) {
          const p = worldPoint(component, fx).sub(tipOffset).add(new Vector3(0, 0, depth))
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
      /** Turns the emulated head to `yaw` degrees (0 = looking down -z, positive = to the left), level. */
      async turnHead(yaw: number) {
        const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (yaw * Math.PI) / 180)
        device().quaternion.set(q.x, q.y, q.z, q.w)
        await frames(2)
      },
      /** Moves the emulated head to a point in the session's floor space. */
      async moveHead(position: [number, number, number]) {
        device().position.set(...position)
        await frames(2)
      },
      /** The user recentres the view (Meta button held). */
      async recenter() {
        device().recenter()
        await frames(3)
      },
      /** Degrees between the way a label's panel faces (+z) and the direction to the head. */
      facingAngle(label: string) {
        const root = rootOf(targetFor(label)) as unknown as Object3D
        const facing = root.getWorldDirection(new Vector3())
        const camera = (tres.renderer as unknown as WebGLRenderer).xr.getCamera()
        const toHead = camera.getWorldPosition(new Vector3()).sub(worldPoint(targetFor(label)))
        return (facing.angleTo(toHead) * 180) / Math.PI
      },
      /** Head position and the level direction it looks in (unit, y = 0), in world space. */
      head() {
        const camera = (tres.renderer as unknown as WebGLRenderer).xr.getCamera()
        const position = camera.getWorldPosition(new Vector3())
        const forward = camera.getWorldDirection(new Vector3()).setY(0).normalize()
        return { position: position.toArray(), forward: forward.toArray() }
      },
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
      /**
       * Where a label's centre sits inside a container (a scrolling list's
       * window), from -0.5 (bottom edge) to 0.5 (top edge); outside that
       * range it is scrolled out of view.
       */
      inViewAt(label: string, container: string) {
        const c = targetFor(container)
        c.updateWorldMatrix(true, false)
        return worldPoint(targetFor(label)).applyMatrix4(c.matrixWorld.clone().invert()).y
      },
      /** World-space centre of a label's component, as [x, y, z]. */
      worldCenter: (label: string) => worldPoint(targetFor(label)).toArray(),
      /** Holds the trigger on a label and moves the controller by `delta` metres (ray stays parallel). */
      async rayCarry(hand: 'left' | 'right', label: string, delta: [number, number, number]) {
        const controller = device().controllers[hand]
        if (!controller) throw new Error(`No ${hand} controller`)
        await aimUntilHovered(hand, label)
        await frames(2)
        const start = new Vector3(controller.position.x, controller.position.y, controller.position.z)
        controller.updateButtonValue('trigger', 1)
        await frames(2)
        for (let i = 1; i <= 8; i++) {
          const p = start.clone().add(new Vector3(...delta).multiplyScalar(i / 8))
          controller.position.set(p.x, p.y, p.z)
          await frames(1)
        }
        await frames(3)
        controller.updateButtonValue('trigger', 0)
        await frames(2)
      },
      /**
       * Pinches with the fingertip 3 cm in front of a label and holds. IWER
       * reports the pinch (select) a frame before the fingers close, so the
       * fingertip, and whatever it grabbed, jumps toward the thumb right
       * after; this waits for that to settle. A real headset reports the
       * pinch once the fingers have met.
       */
      async pinchHold(hand: 'left' | 'right', label: string) {
        const handInput = device().hands[hand]
        if (!handInput) throw new Error(`No ${hand} hand`)
        const target = worldPoint(targetFor(label))
        const tipOffset = await measureFingertip(hand, target)
        const start = target.clone().sub(tipOffset).add(new Vector3(0, 0, 0.03))
        handInput.position.set(start.x, start.y, start.z)
        await frames(3)
        handInput.updatePinchValue(1)
        await frames(4)
      },
      /** Moves a hand by `delta` metres over a few frames. */
      async moveHandBy(hand: 'left' | 'right', delta: [number, number, number]) {
        const handInput = device().hands[hand]
        if (!handInput) throw new Error(`No ${hand} hand`)
        const p0 = handInput.position
        const start = new Vector3(p0.x, p0.y, p0.z)
        for (let i = 1; i <= 8; i++) {
          const p = start.clone().add(new Vector3(...delta).multiplyScalar(i / 8))
          handInput.position.set(p.x, p.y, p.z)
          await frames(1)
        }
        await frames(3)
      },
      async releasePinch(hand: 'left' | 'right') {
        device().hands[hand]?.updatePinchValue(0)
        await frames(2)
      },
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
