import { expect, test } from './fixtures'

// Playground: <XrTabs> "Controls" / "List", a 12-track <XrList name="tracks">
// in the List tab, and an <XrTooltip> "Switch light / dark" on Theme.

test.describe('tabs, list and tooltip in the browser', () => {
  test('tabs switch content, and the content keeps its place', async ({ scene }) => {
    const tabsY = (await scene.screenPoint('Controls')).y
    await scene.click('List')
    await scene.expectText('Pick a track')
    expect(await scene.isShown('Count: 0')).toBe(false)
    expect((await scene.screenPoint('Pick a track')).y).toBeGreaterThan(tabsY)

    await scene.click('Controls')
    await expect.poll(() => scene.isShown('Count: 0')).toBe(true)
    expect((await scene.screenPoint('Count: 0')).y).toBeGreaterThan(tabsY)
    await scene.click('Increment')
    await scene.expectText('Count: 1')
  })

  test('clicking a list item selects it; the wheel scrolls', async ({ scene, page }) => {
    await scene.click('List')
    await scene.click('Track 2')
    await scene.expectText('Playing: Track 2')

    const before = (await scene.screenPoint('Track 12')).y
    const list = await scene.screenPoint('Track 3')
    await page.mouse.move(list.x, list.y)
    await page.mouse.wheel(0, 1000)
    await expect.poll(async () => (await scene.screenPoint('Track 12')).y).toBeLessThan(before - 50)
    await scene.click('Track 12')
    await scene.expectText('Playing: Track 12')
  })

  test('the tooltip shows after a hover, and hides on leave', async ({ scene, page }) => {
    expect(await scene.isShown('Switch light / dark')).toBe(false)
    const theme = await scene.screenPoint('Theme')
    await page.mouse.move(theme.x, theme.y)
    await expect.poll(() => scene.isShown('Switch light / dark')).toBe(true)
    await page.mouse.move(theme.x, theme.y + 200)
    await expect.poll(() => scene.isShown('Switch light / dark')).toBe(false)
  })
})

test.describe('tabs, list and tooltip in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('a ray drag scrolls the list without selecting; a tap selects', async ({ scene }) => {
    await scene.rayClick('right', 'List')
    await scene.expectText('Pick a track')
    const before = await scene.worldCenter('Track 6')
    await scene.rayCarry('right', 'Track 3', [0, 0.08, 0])
    const after = await scene.worldCenter('Track 6')
    expect(after[1] - before[1]).toBeGreaterThan(0.03)
    expect(await scene.isShown('Pick a track')).toBe(true)

    // The list coasts on after a drag; a tap on a moving list only stops it
    // (as on a phone), so wait until it settles.
    let last = after[1]
    await expect
      .poll(async () => {
        const y = (await scene.worldCenter('Track 6'))[1]!
        const settled = Math.abs(y - last) < 1e-4
        last = y
        return settled
      })
      .toBe(true)
    // How far the list coasts depends on the frame rate; tap a track that
    // ended up well inside the visible area.
    let visible: string | undefined
    for (let i = 1; i <= 12 && !visible; i++) {
      if (Math.abs(await scene.inViewAt(`Track ${i}`, '#tracks')) < 0.3) visible = `Track ${i}`
    }
    expect(visible).toBeDefined()
    await scene.rayClick('right', visible!)
    await scene.expectText(`Playing: ${visible}`)
  })

  test('a fingertip taps a tab and a list item', async ({ scene }) => {
    await scene.setInputMode('hand')
    await scene.poke('right', 'List')
    await scene.expectText('Pick a track')
    await scene.poke('right', 'Track 1')
    await scene.expectText('Playing: Track 1')
  })

  test('the tooltip shows while a ray points at its target', async ({ scene, page }) => {
    await page.evaluate(() => window.__xrTest!.aim('right', 'Theme'))
    await expect.poll(() => scene.isShown('Switch light / dark')).toBe(true)
    await page.evaluate(() => window.__xrTest!.aim('right', 'Increment'))
    await expect.poll(() => scene.isShown('Switch light / dark')).toBe(false)
  })
})
