import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { Component as UikitComponent } from '@pmndrs/uikit'
import type { createXRStore } from '@pmndrs/xr'
import type { ThemeTokens } from '@vue-xr-ui/tokens'
import type { Object3D, Vector3 } from 'three'
import type { ControlPointerEvent } from './press'

/** Called every frame, in and out of an XR session. `delta` is in milliseconds. */
export type FrameCallback = (delta: number, frame: XRFrame | undefined) => void

export interface FrameHub {
  add(cb: FrameCallback): () => void
}

/** The store created by @pmndrs/xr's vanilla `createXRStore`. */
export type XRStore = ReturnType<typeof createXRStore>

export type XrMode = 'immersive-vr' | 'immersive-ar'

/**
 * App-wide XR state. It lives above <TresCanvas> so that regular DOM UI
 * (an "Enter VR" button, a settings page) can read it and start a session.
 */
export interface XrController {
  store: ShallowRef<XRStore | undefined>
  session: ShallowRef<XRSession | undefined>
  mode: Ref<XrMode | null>
  isPresenting: Readonly<Ref<boolean>>
  /**
   * The session has a system keyboard (Meta Quest Browser:
   * `XRSession.isSystemKeyboardSupported`). It opens by itself when a text
   * field is focused, so <XrKeyboard> hides itself to not show two keyboards.
   */
  systemKeyboard: Readonly<Ref<boolean>>
  supported: Ref<{ vr: boolean; ar: boolean }>
  enterVR(): Promise<void>
  enterAR(): Promise<void>
  exit(): Promise<void>
}

/** Where the viewer is, provided by <XrScene>. */
export interface XrView {
  /** World position of the viewer's head (the XR camera in a session, else the scene camera). */
  headPosition(target: Vector3): Vector3
  /** World direction the viewer looks in (unit vector). */
  headDirection(target: Vector3): Vector3
  /** Calls `cb` when the user recentres the view (the floor origin moves). */
  onRecenter(cb: () => void): () => void
}

/** A pointerdown seen by <XrScene>'s press hub: the event plus the object it hit first. */
export type ScenePointerEvent = ControlPointerEvent & { object?: Object3D }

/**
 * Every press that starts in the scene, provided by <XrScene>: on any
 * vue-xr-ui root or inside it, and on empty space. Popups use it to close on
 * a press outside them. Presses on other three.js objects are not seen.
 */
export interface PressHub {
  /** Listens on a layout root; called by every root (runtime/node.ts). */
  addRoot(root: Object3D): () => void
  /** Calls `cb` on every pointerdown on a root, inside it, or on empty space. */
  onDown(cb: (event: ScenePointerEvent) => void): () => void
}

export const XR_VIEW: InjectionKey<XrView> = Symbol('vue-xr-ui:view')
export const XR_CONTROLLER: InjectionKey<XrController> = Symbol('vue-xr-ui:controller')
export const XR_THEME: InjectionKey<Ref<ThemeTokens>> = Symbol('vue-xr-ui:theme')
export const PRESS_HUB: InjectionKey<PressHub> = Symbol('vue-xr-ui:press-hub')
export const FRAME_HUB: InjectionKey<FrameHub> = Symbol('vue-xr-ui:frame-hub')
/** The uikit component a child should attach to. Absent for layout roots. */
export const UIKIT_PARENT: InjectionKey<UikitComponent> = Symbol('vue-xr-ui:uikit-parent')
