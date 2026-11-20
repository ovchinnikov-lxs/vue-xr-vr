import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'

const PROFILES_CDN = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/'
const PROFILES_DIR = fileURLToPath(new URL('./assets/webxr-input-profiles/', import.meta.url))

type Hand = 'left' | 'right'

interface XrTest {
  texts(): string[]
  hasText(label: string): boolean
  state(): { presenting: boolean; mode: string | null; emulator: boolean }
  size(label: string): [number, number] | null
  screenPoint(label: string): { x: number; y: number }
  setInputMode(mode: 'controller' | 'hand'): Promise<void>
  aim(hand: Hand, label: string): void
  poke(hand: Hand, label: string): Promise<void>
  pinch(hand: Hand): Promise<void>
  frames(n: number): Promise<void>
  frameTime(): number
  pullTrigger(hand: Hand, holdMs?: number): Promise<void>
  exit(): Promise<void>
  recordEvents(label: string): void
  events(): string[]
}

declare global {
  interface Window {
    __xrTest?: XrTest
  }
}

/** Typed access to the in-page test bridge (apps/playground/src/e2e/TestHook.ts). */
export class Scene {
  constructor(readonly page: Page) {}

  async ready() {
    await this.page.waitForFunction(() => {
      const size = window.__xrTest?.size('Increment')
      return size != null && size[0] > 0
    })
  }

  async emulatorReady() {
    await this.page.waitForFunction(() => window.__xrTest?.state().emulator === true)
  }

  texts() {
    return this.page.evaluate(() => window.__xrTest!.texts())
  }

  state() {
    return this.page.evaluate(() => window.__xrTest!.state())
  }

  size(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.size(l), label)
  }

  recordEvents(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.recordEvents(l), label)
  }

  events() {
    return this.page.evaluate(() => window.__xrTest!.events())
  }

  /** Ends the session the way the headset's system menu would. */
  exit() {
    return this.page.evaluate(() => window.__xrTest!.exit())
  }

  async click(label: string) {
    const point = await this.page.evaluate((l) => window.__xrTest!.screenPoint(l), label)
    await this.page.mouse.click(point.x, point.y)
  }

  async expectText(label: string) {
    await expect.poll(() => this.texts()).toContain(label)
  }

  setInputMode(mode: 'controller' | 'hand') {
    return this.page.evaluate((m) => window.__xrTest!.setInputMode(m), mode)
  }

  poke(hand: Hand, label: string) {
    return this.page.evaluate(([h, l]) => window.__xrTest!.poke(h, l), [hand, label] as const)
  }

  /** Aim a hand's ray at a label and pinch. */
  async pinchClick(hand: Hand, label: string) {
    await this.page.evaluate(([h, l]) => window.__xrTest!.aim(h, l), [hand, label] as const)
    await this.page.evaluate(() => window.__xrTest!.frames(3))
    await this.page.evaluate((h) => window.__xrTest!.pinch(h), hand)
  }

  /** Aim a controller ray at a label and pull the trigger (held for `holdMs`). */
  async rayClick(hand: Hand, label: string, holdMs = 0) {
    await this.page.evaluate(([h, l]) => window.__xrTest!.aim(h, l), [hand, label] as const)
    // Let the ray settle on the target first (hover), then click.
    await this.page.evaluate(() => window.__xrTest!.frames(3))
    await this.page.evaluate(([h, ms]) => window.__xrTest!.pullTrigger(h, ms), [hand, holdMs] as const)
  }
}

export const test = base.extend<{ scene: Scene }>({
  scene: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    // Controller layouts and models normally come from a CDN; serve them locally.
    await page.route(`${PROFILES_CDN}**`, (route) => {
      const path = route.request().url().slice(PROFILES_CDN.length)
      return route.fulfill({ path: PROFILES_DIR + path }).catch(() => {
        console.warn(`[e2e] no local copy of ${path}`)
        return route.fulfill({ status: 404 })
      })
    })
    await page.goto('/?e2e')
    const scene = new Scene(page)
    await scene.ready()
    await use(scene)
    expect(errors, 'uncaught errors in the page').toEqual([])
  },
})

export { expect }
