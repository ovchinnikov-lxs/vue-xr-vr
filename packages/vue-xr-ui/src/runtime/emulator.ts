import type { XRDevice } from 'iwer'
import type { XRStore } from './context'

export type EmulatedDevice = 'metaQuest3' | 'metaQuest2' | 'metaQuestPro' | 'oculusQuest1'
export type EmulatedRoom = 'office_small' | 'meeting_room' | 'living_room' | 'music_room' | 'office_large'

export interface EmulatorOptions {
  /** Which headset to emulate. Default: Quest 3. */
  device?: EmulatedDevice
  /** Synthetic room for MR (passthrough, planes, meshes). `false` for none. */
  room?: EmulatedRoom | false
  /** Where to inject: only on localhost (default), or always. */
  inject?: 'localhost' | 'always'
}

/**
 * Injects IWER, Meta's WebXR emulator, when no real headset is available.
 *
 * @pmndrs/xr can do this too, but its injection calls IWER's installRuntime()
 * without `forceInstall`, and IWER >= 2.3 then refuses to override the
 * `navigator.xr` that desktop Chrome always exposes (even with no headset).
 * So we do it here: same idea, with `forceInstall`.
 */
export async function injectEmulator(store: XRStore, options: EmulatorOptions = {}): Promise<XRDevice | undefined> {
  if (typeof window === 'undefined') return undefined
  const inject = options.inject ?? 'localhost'
  if (inject === 'localhost' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) return undefined

  const xr = navigator.xr
  if (xr) {
    const [vr, ar] = await Promise.all([
      xr.isSessionSupported('immersive-vr').catch(() => false),
      xr.isSessionSupported('immersive-ar').catch(() => false),
    ])
    if (vr || ar) return undefined
  }

  // Loaded lazily: the emulator and its rooms are several MB.
  const [iwer, { DevUI }, { SyntheticEnvironmentModule }] = await Promise.all([
    import('iwer'),
    import('@iwer/devui'),
    import('@iwer/sem'),
  ])
  const device = new iwer.XRDevice(iwer[options.device ?? 'metaQuest3'])
  device.installRuntime({ forceInstall: true })
  device.installDevUI(DevUI)
  if (options.room !== false) {
    device.installSEM(SyntheticEnvironmentModule)
    device.sem?.loadDefaultEnvironment(options.room ?? 'living_room')
  }
  store.setState({ emulator: device })
  return device
}
