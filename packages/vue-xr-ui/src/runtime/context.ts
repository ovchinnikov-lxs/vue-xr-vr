import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { Component as UikitComponent } from '@pmndrs/uikit'
import type { createXRStore } from '@pmndrs/xr'
import type { ThemeTokens } from '@vue-xr-ui/tokens'

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
  supported: Ref<{ vr: boolean; ar: boolean }>
  enterVR(): Promise<void>
  enterAR(): Promise<void>
  exit(): Promise<void>
}

export const XR_CONTROLLER: InjectionKey<XrController> = Symbol('vue-xr-ui:controller')
export const XR_THEME: InjectionKey<Ref<ThemeTokens>> = Symbol('vue-xr-ui:theme')
export const FRAME_HUB: InjectionKey<FrameHub> = Symbol('vue-xr-ui:frame-hub')
/** The uikit component a child should attach to. Absent for layout roots. */
export const UIKIT_PARENT: InjectionKey<UikitComponent> = Symbol('vue-xr-ui:uikit-parent')
