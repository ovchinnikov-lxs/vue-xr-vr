import { getCurrentInstance, inject, type App, type InjectionKey } from 'vue'

/**
 * TresJS renders the scene with its own Vue renderer, a separate app whose
 * components do not see `app.provide()` values from the DOM app (unless
 * <TresCanvas enable-provide-bridge>). It does point `appContext.app` back at
 * the original app, so the plugin also keeps its values in this registry and
 * components inside the canvas can find them through it.
 */
const registry = new WeakMap<App, Map<InjectionKey<unknown>, unknown>>()

export function provideAppWide<T>(app: App, key: InjectionKey<T>, value: T): void {
  app.provide(key, value)
  let values = registry.get(app)
  if (!values) registry.set(app, (values = new Map()))
  values.set(key as InjectionKey<unknown>, value)
}

export function injectAppWide<T>(key: InjectionKey<T>): T | undefined {
  const direct = inject(key, undefined)
  if (direct !== undefined) return direct
  const app = getCurrentInstance()?.appContext.app
  return app ? (registry.get(app)?.get(key as InjectionKey<unknown>) as T | undefined) : undefined
}
