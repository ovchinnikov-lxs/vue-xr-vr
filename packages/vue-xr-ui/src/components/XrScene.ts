import { defineComponent, onBeforeUnmount, provide, type PropType } from 'vue'
import { useLoop, useTresContext } from '@tresjs/core'
import { reversePainterSortStable } from '@pmndrs/uikit'
import { createXRStore, type XRStoreOptions } from '@pmndrs/xr'
import { getVoidObject } from '@pmndrs/pointer-events'
import type { Object3D, Scene, Vector3, WebGLRenderer } from 'three'
import { FRAME_HUB, PRESS_HUB, XR_CONTROLLER, XR_PLANES, XR_VIEW, type FrameCallback, type FrameHub, type PressHub, type ScenePointerEvent } from '../runtime/context'
import type { InternalXrController } from '../runtime/controller'
import { injectAppWide } from '../runtime/app-inject'
import { injectEmulator, type EmulatorOptions } from '../runtime/emulator'
import { createPlaneTracker } from '../runtime/planes'

/**
 * Turns a <TresCanvas> into an XR-capable scene. Place it directly inside
 * <TresCanvas>; every vue-xr-ui component must live below it.
 *
 * It owns three things:
 * - the @pmndrs/xr store (session, controllers, hands, pointer events in XR),
 * - one frame loop that keeps running inside the headset,
 * - the renderer flags uikit needs (local clipping, transparent sort).
 */
export const XrScene = defineComponent({
  name: 'XrScene',
  props: {
    /**
     * Options for the `@pmndrs/xr` store: session features (`handTracking`,
     * `planeDetection`, `hitTest`, `anchors`...) and input config. Defaults
     * to the device's native resolution (`frameBufferScaling: 'high'`) and
     * no fixed foveation (`foveation: 0`), for sharp text; lower them to
     * trade sharpness for GPU time.
     */
    options: { type: Object as PropType<Omit<XRStoreOptions<any>, 'emulate'>>, default: () => ({}) },
    /**
     * WebXR emulator (a virtual Quest 3 with controllers, hands and a
     * synthetic room). Injected on localhost when no headset is found.
     * `false` turns it off.
     */
    emulator: { type: [Object, Boolean] as PropType<EmulatorOptions | boolean>, default: true },
    /**
     * In a passthrough (`immersive-ar`) session, clear to transparent and
     * hide `scene.background`, so the room shows through behind the UI. Both
     * come back when the session ends. `false` keeps the canvas colour.
     */
    passthrough: { type: Boolean, default: true },
  },
  emits: {
    /** A session started (VR or passthrough). */
    sessionStart: (_session: XRSession) => true,
    /** The session ended. */
    sessionEnd: () => true,
    /**
     * The user recentred the view (held the Meta button): the floor origin
     * moved to where they stand now. Content placed in front of the user
     * can be placed again; anchored content stays where it is in the room.
     */
    recenter: () => true,
  },
  setup(props, { slots, emit }) {
    const ctx = useTresContext()
    const controller = injectAppWide(XR_CONTROLLER) as InternalXrController | undefined
    if (!controller) throw new Error('[vue-xr-ui] Install the plugin first: app.use(createXrUi()).')

    const renderer = ctx.renderer.instance as WebGLRenderer
    renderer.xr.enabled = true
    renderer.localClippingEnabled = true
    renderer.setTransparentSort(reversePainterSortStable)

    const scene = ctx.scene.value
    const getCamera = () => ctx.camera.activeCamera.value!

    const store = createXRStore(renderer.domElement, scene, getCamera, renderer.xr, {
      handTracking: true,
      // Sharp text. The browser's default framebuffer on Quest is smaller
      // than the display, and three.js turns fixed foveation all the way up
      // (1), which blurs everything off-centre. A UI scene is cheap to draw,
      // so render at the device's native resolution with no foveation. Apps
      // that need the GPU time back can pass their own values in `options`.
      frameBufferScaling: 'high',
      foveation: 0,
      ...props.options,
      // TresJS already forwards mouse/touch events into the scene.
      htmlInput: false,
      // We inject the emulator ourselves, see runtime/emulator.ts.
      emulate: false,
    })
    if (props.emulator !== false) {
      injectEmulator(store, props.emulator === true ? {} : props.emulator).catch((error) =>
        console.warn('[vue-xr-ui] Could not start the WebXR emulator.', error),
      )
    }

    const callbacks = new Set<FrameCallback>()
    const hub: FrameHub = {
      add(cb) {
        callbacks.add(cb)
        return () => callbacks.delete(cb)
      },
    }
    provide(FRAME_HUB, hub)

    // Presses anywhere, for popups that close on a press outside. A listener
    // on the scene itself would make every mesh in it a pointer target, so
    // listen on the UI roots (already targets) and on the "void" object that
    // @pmndrs/pointer-events hits when a ray hits nothing.
    const downListeners = new Set<(event: ScenePointerEvent) => void>()
    const onDown = (event: unknown) => {
      for (const cb of [...downListeners]) cb(event as ScenePointerEvent)
    }
    const listenOn = (object: Object3D) => {
      object.addEventListener('pointerdown', onDown)
      return () => object.removeEventListener('pointerdown', onDown)
    }
    const stopVoid = listenOn(getVoidObject(scene))
    const presses: PressHub = {
      addRoot: listenOn,
      onDown(cb) {
        downListeners.add(cb)
        return () => downListeners.delete(cb)
      },
    }
    provide(PRESS_HUB, presses)
    const viewer = () => (renderer.xr.isPresenting ? renderer.xr.getCamera() : getCamera())
    const recenterListeners = new Set<() => void>()
    // Before render, three.js has the XR camera at the first eye's pose (it
    // moves it to the centre between the eyes only while rendering), so take
    // the midpoint of the eyes ourselves: a panel facing the left eye is off
    // by ~2 degrees.
    const headPosition = (target: Vector3) => {
      const eyes = renderer.xr.isPresenting ? renderer.xr.getCamera().cameras : []
      if (eyes.length < 2) return viewer().getWorldPosition(target)
      target.addVectors(eyes[0]!.position, eyes[1]!.position).multiplyScalar(0.5)
      const parent = getCamera().parent
      if (parent) {
        parent.updateWorldMatrix(true, false)
        target.applyMatrix4(parent.matrixWorld)
      }
      return target
    }
    provide(XR_VIEW, {
      headPosition,
      headDirection: (target) => viewer().getWorldDirection(target),
      onRecenter(cb) {
        recenterListeners.add(cb)
        return () => recenterListeners.delete(cb)
      },
    })

    const planes = createPlaneTracker(store)
    provide(XR_PLANES, planes)

    const tick = (delta: number, frame: XRFrame | undefined) => {
      store.update(frame, delta)
      planes.update(frame)
      for (const cb of callbacks) cb(delta, frame)
    }

    // Outside XR, TresJS owns the loop and renders; we just hook in.
    let presenting = false
    useLoop().onBeforeRender(({ delta }) => {
      if (!presenting) tick(delta * 1000, undefined)
    })

    // Inside XR, window.requestAnimationFrame stops, so we take over with
    // renderer.setAnimationLoop, which three.js runs on the XRSession's rAF.
    const startXrLoop = () => {
      presenting = true
      ctx.renderer.loop.stop()
      let prev: number | undefined
      renderer.setAnimationLoop((time, frame) => {
        const delta = prev == null ? 0 : time - prev
        prev = time
        tick(delta, frame)
        renderer.render(scene, getCamera())
      })
    }
    const stopXrLoop = () => {
      presenting = false
      renderer.setAnimationLoop(null)
      ctx.renderer.loop.start()
    }

    // Passthrough: the compositor shows the camera feed wherever the frame
    // is transparent. TresCanvas clears with an opaque colour, so clear to
    // alpha 0 for the session and put the canvas colour back afterwards.
    let saved: { alpha: number; background: Scene['background'] } | undefined
    const showRoom = () => {
      saved = { alpha: renderer.getClearAlpha(), background: scene.background }
      renderer.setClearAlpha(0)
      scene.background = null
    }
    const hideRoom = () => {
      if (!saved) return
      renderer.setClearAlpha(saved.alpha)
      scene.background = saved.background
      saved = undefined
    }

    // A recentre (Meta button held) fires `reset` on the reference space.
    let space: XRReferenceSpace | undefined
    const onReset = () => {
      for (const cb of [...recenterListeners]) cb()
      emit('recenter')
    }
    const watchSpace = (next: XRReferenceSpace | undefined) => {
      if (next === space) return
      space?.removeEventListener('reset', onReset)
      space = next
      space?.addEventListener('reset', onReset)
    }

    const unsubscribe = store.subscribe((state, prev) => {
      watchSpace(state.originReferenceSpace)
      // @pmndrs/xr builds controllers, hands and their pointers once it knows
      // the scene origin (on the first XR frame), but only for input sources
      // that arrive after that. Sources the session reports up front (hands
      // already tracked at launch) would get no pointers at all. Re-announce
      // them once the origin is known.
      if (state.origin && state.origin !== prev.origin && state.inputSourceStates.length > 0) {
        queueMicrotask(() => store.setState({ inputSourceStates: [...store.getState().inputSourceStates] }))
      }
      if (state.session && !prev.session) {
        if (state.mode === 'immersive-ar' && props.passthrough) showRoom()
        startXrLoop()
        emit('sessionStart', state.session)
      } else if (!state.session && prev.session) {
        stopXrLoop()
        hideRoom()
        watchSpace(undefined)
        emit('sessionEnd')
      }
    })
    const detach = controller.attach(store)

    onBeforeUnmount(() => {
      unsubscribe()
      detach()
      stopVoid()
      if (presenting) renderer.setAnimationLoop(null)
      hideRoom()
      watchSpace(undefined)
      store.destroy()
    })

    return () => slots.default?.()
  },
})
