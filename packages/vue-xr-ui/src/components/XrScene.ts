import { defineComponent, onBeforeUnmount, provide, type PropType } from 'vue'
import { useLoop, useTresContext } from '@tresjs/core'
import { reversePainterSortStable } from '@pmndrs/uikit'
import { createXRStore, type XRStoreOptions } from '@pmndrs/xr'
import type { WebGLRenderer } from 'three'
import { FRAME_HUB, XR_CONTROLLER, type FrameCallback, type FrameHub } from '../runtime/context'
import type { InternalXrController } from '../runtime/controller'
import { injectAppWide } from '../runtime/app-inject'
import { injectEmulator, type EmulatorOptions } from '../runtime/emulator'

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
     * Options for @pmndrs/xr's store: session features (`handTracking`,
     * `planeDetection`, `hitTest`, `anchors`...) and input config.
     */
    options: { type: Object as PropType<Omit<XRStoreOptions<any>, 'emulate'>>, default: () => ({}) },
    /**
     * WebXR emulator (a virtual Quest 3 with controllers, hands and a
     * synthetic room). Injected on localhost when no headset is found.
     * `false` turns it off.
     */
    emulator: { type: [Object, Boolean] as PropType<EmulatorOptions | boolean>, default: true },
  },
  emits: ['sessionStart', 'sessionEnd'],
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

    const tick = (delta: number, frame: XRFrame | undefined) => {
      store.update(frame, delta)
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

    const unsubscribe = store.subscribe((state, prev) => {
      if (state.session && !prev.session) {
        startXrLoop()
        emit('sessionStart', state.session)
      } else if (!state.session && prev.session) {
        stopXrLoop()
        emit('sessionEnd')
      }
    })
    const detach = controller.attach(store)

    onBeforeUnmount(() => {
      unsubscribe()
      detach()
      if (presenting) renderer.setAnimationLoop(null)
      store.destroy()
    })

    return () => slots.default?.()
  },
})
