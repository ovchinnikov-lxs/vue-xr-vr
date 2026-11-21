import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'
import { CoverageReport } from 'monocart-coverage-reports'
import { coverageEnabled, coverageOptions } from './coverage'

const PROFILES_CDN = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/'
const PROFILES_DIR = fileURLToPath(new URL('./assets/webxr-input-profiles/', import.meta.url))

type Hand = 'left' | 'right'

interface XrTest {
  texts(): string[]
  hasText(label: string): boolean
  isShown(label: string): boolean
  state(): { presenting: boolean; mode: string | null; emulator: boolean }
  size(label: string): [number, number] | null
  inputState(label: string): { value: string; focused: boolean }
  background(label: string): string
  screenPoint(label: string, fx?: number): { x: number; y: number }
  setInputMode(mode: 'controller' | 'hand'): Promise<void>
  aim(hand: Hand, label: string, fx?: number): void
  aimUntilHovered(hand: Hand, label: string, fx?: number): Promise<void>
  rayDrag(hand: Hand, label: string, fromFx: number, toFx: number): Promise<void>
  poke(hand: Hand, label: string, fromFx?: number, toFx?: number): Promise<void>
  pinch(hand: Hand): Promise<void>
  worldCenter(label: string): [number, number, number]
  inViewAt(label: string, container: string): number
  rayCarry(hand: Hand, label: string, delta: [number, number, number]): Promise<void>
  pinchHold(hand: Hand, label: string): Promise<void>
  moveHandBy(hand: Hand, delta: [number, number, number]): Promise<void>
  releasePinch(hand: Hand): Promise<void>
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

  isShown(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.isShown(l), label)
  }

  state() {
    return this.page.evaluate(() => window.__xrTest!.state())
  }

  size(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.size(l), label)
  }

  inputState(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.inputState(l), label)
  }

  background(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.background(l), label)
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

  /**
   * Labels name the text inside a control; `#name` finds a control by its
   * `name` attr instead. `fx` picks a point from the left edge (0) to the
   * right edge (1).
   */
  async screenPoint(label: string, fx = 0.5) {
    // Layout lags a state change by a frame; measure once it has settled.
    await this.page.evaluate(() => window.__xrTest!.frames(2))
    return this.page.evaluate(([l, f]) => window.__xrTest!.screenPoint(l, f), [label, fx] as const)
  }

  async click(label: string, fx = 0.5) {
    const point = await this.screenPoint(label, fx)
    await this.page.mouse.click(point.x, point.y)
  }

  /** Presses the mouse at `fromFx` across a control, drags to `toFx`, releases. */
  async mouseDrag(label: string, fromFx: number, toFx: number) {
    const from = await this.screenPoint(label, fromFx)
    const to = await this.screenPoint(label, toFx)
    await this.page.mouse.move(from.x, from.y)
    await this.page.mouse.down()
    await this.page.mouse.move(to.x, to.y, { steps: 8 })
    await this.page.mouse.up()
  }

  /** A label's position inside a container's visible area: -0.5 bottom edge, 0.5 top edge. */
  inViewAt(label: string, container: string) {
    return this.page.evaluate(([l, c]) => window.__xrTest!.inViewAt(l, c), [label, container] as const)
  }

  worldCenter(label: string) {
    return this.page.evaluate((l) => window.__xrTest!.worldCenter(l), label)
  }

  /** Presses the mouse on a control and drags it by (dx, dy) CSS pixels. */
  async mouseDragBy(label: string, dx: number, dy: number) {
    const from = await this.screenPoint(label)
    await this.page.mouse.move(from.x, from.y)
    await this.page.mouse.down()
    await this.page.mouse.move(from.x + dx, from.y + dy, { steps: 8 })
    await this.page.waitForTimeout(100)
    await this.page.mouse.up()
  }

  /** Grabs a control with a controller ray (trigger) and moves the controller by `delta` metres. */
  rayCarry(hand: Hand, label: string, delta: [number, number, number]) {
    return this.page.evaluate(([h, l, d]) => window.__xrTest!.rayCarry(h, l, d), [hand, label, delta] as const)
  }

  /** Pinches a control with a hand and keeps holding. */
  pinchHold(hand: Hand, label: string) {
    return this.page.evaluate(([h, l]) => window.__xrTest!.pinchHold(h, l), [hand, label] as const)
  }

  moveHandBy(hand: Hand, delta: [number, number, number]) {
    return this.page.evaluate(([h, d]) => window.__xrTest!.moveHandBy(h, d), [hand, delta] as const)
  }

  releasePinch(hand: Hand) {
    return this.page.evaluate((h) => window.__xrTest!.releasePinch(h), hand)
  }

  /** Holds a controller trigger at `fromFx` across a control and sweeps the ray to `toFx`. */
  rayDrag(hand: Hand, label: string, fromFx: number, toFx: number) {
    return this.page.evaluate(([h, l, a, b]) => window.__xrTest!.rayDrag(h, l, a, b), [hand, label, fromFx, toFx] as const)
  }

  async expectText(label: string) {
    await expect.poll(() => this.texts()).toContain(label)
  }

  setInputMode(mode: 'controller' | 'hand') {
    return this.page.evaluate((m) => window.__xrTest!.setInputMode(m), mode)
  }

  /** Taps a control with a fingertip, or presses at `fromFx` and slides to `toFx`. */
  poke(hand: Hand, label: string, fromFx = 0.5, toFx = fromFx) {
    return this.page.evaluate(([h, l, a, b]) => window.__xrTest!.poke(h, l, a, b), [hand, label, fromFx, toFx] as const)
  }

  /** Aim a hand's ray at a label and pinch. */
  async pinchClick(hand: Hand, label: string) {
    await this.page.evaluate(([h, l]) => window.__xrTest!.aim(h, l), [hand, label] as const)
    await this.page.evaluate(() => window.__xrTest!.frames(3))
    await this.page.evaluate((h) => window.__xrTest!.pinch(h), hand)
  }

  /** Aim a controller ray at a label (at `fx` across it) and pull the trigger (held for `holdMs`). */
  async rayClick(hand: Hand, label: string, { fx = 0.5, holdMs = 0 } = {}) {
    // Let the ray settle on the target first (hover), then click.
    await this.page.evaluate(([h, l, f]) => window.__xrTest!.aimUntilHovered(h, l, f), [hand, label, fx] as const)
    await this.page.evaluate(() => window.__xrTest!.frames(2))
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
    // A stand-in for the Web Speech API (the real one needs Google's servers):
    // on start it hears "привет", on stop it settles on "привет мир".
    // `window.__fakeSpeech.fail` makes it fail with that error instead.
    await page.addInitScript(() => {
      const control: { fail?: string; lang?: string } = {}
      ;(window as unknown as { __fakeSpeech: typeof control }).__fakeSpeech = control
      class FakeSpeechRecognition {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          control.lang = this.lang
          setTimeout(() => {
            if (control.fail) {
              this.onerror?.({ error: control.fail })
              this.onend?.()
              return
            }
            this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'привет' } }] })
          }, 50)
        }
        stop() {
          setTimeout(() => {
            this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'привет мир' } }] })
            this.onend?.()
          }, 50)
        }
      }
      ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeSpeechRecognition
    })
    if (coverageEnabled) await page.coverage.startJSCoverage({ resetOnNavigation: false })
    await page.goto('/?e2e')
    const scene = new Scene(page)
    await scene.ready()
    await use(scene)
    if (coverageEnabled) await new CoverageReport(coverageOptions).add(await page.coverage.stopJSCoverage())
    expect(errors, 'uncaught errors in the page').toEqual([])
  },
})

export { expect }
