import { expect, test } from './fixtures'

// The playground's main panel is <XrWindow name="window"> with a handle bar
// under it (named "handle").

const moved = (a: number[], b: number[]) => b.map((v, i) => v - a[i]!)

test.describe('moving a window', () => {
  test('with the mouse, by its handle', async ({ scene }) => {
    // The handle stays under the cursor (the window turns to face the
    // camera as it moves, so its centre can drift a few pixels).
    const before = await scene.screenPoint('#window.handle')
    await scene.mouseDragBy('#window.handle', 120, -60)
    await expect.poll(async () => {
      const after = await scene.screenPoint('#window.handle')
      return [Math.round(after.x - before.x), Math.round(after.y - before.y)]
    }).toEqual([expect.closeTo(120, -1), expect.closeTo(-60, -1)])
    // Still works where it was put: buttons click.
    await scene.click('Increment')
    await scene.expectText('Count: 1')
  })

  test('dragging elsewhere on the window does not move it', async ({ scene }) => {
    const before = await scene.worldCenter('#window')
    await scene.mouseDragBy('vue-xr-ui', 120, 0)
    expect(moved(before, await scene.worldCenter('#window')).every((d) => Math.abs(d) < 1e-6)).toBe(true)
  })
})

test.describe('moving a window in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('with a controller ray', async ({ scene }) => {
    const before = await scene.worldCenter('#window')
    await scene.rayCarry('right', '#window.handle', [0.2, 0.1, 0])
    const d = moved(before, await scene.worldCenter('#window'))
    expect(d[0]).toBeCloseTo(0.2, 1)
    expect(d[1]).toBeCloseTo(0.1, 1)
    // It turned to face the viewer and still takes input.
    await scene.rayClick('right', 'Increment')
    await scene.expectText('Count: 1')
  })

  test('with a pinch on the handle', async ({ scene }) => {
    await scene.setInputMode('hand')
    await scene.pinchHold('right', '#window.handle')
    const before = await scene.worldCenter('#window')
    await scene.moveHandBy('right', [-0.15, 0.1, 0.05])
    const d = moved(before, await scene.worldCenter('#window'))
    await scene.releasePinch('right')
    expect(d[0]).toBeCloseTo(-0.15, 1)
    expect(d[1]).toBeCloseTo(0.1, 1)
    expect(d[2]).toBeCloseTo(0.05, 1)
  })
})

test.describe('the back of a window', () => {
  test('shows as a plain plate in the surface colour, not nothing', async ({ scene, page }) => {
    // The panel's left padding: plain surface colour, nothing drawn on it.
    const edge = await scene.screenPoint('#window', 0.015)
    const surface = await page.evaluate(({ x, y }) => window.__xrTest!.pixel(x, y), edge)
    await page.evaluate(() => window.__xrTest!.turnRoot('#window', Math.PI))
    const centre = await scene.screenPoint('#window', 0.5)
    const back = await page.evaluate(({ x, y }) => window.__xrTest!.pixel(x, y), centre)
    for (let i = 0; i < 3; i++) expect(Math.abs(back[i]! - surface[i]!)).toBeLessThan(6)
  })
})
