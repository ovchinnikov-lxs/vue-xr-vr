import { expect, test } from './fixtures'

// The mixed reality scene (src/scenes/MixedReality.vue) in the emulated
// Quest 3, with a synthetic kitchen around it: passthrough, planes, anchors.
test.use({ scenePath: '/?e2e&scene=mr&room=kitchen', readyLabel: 'Mixed reality' })

test.describe('passthrough', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await expect(page.getByRole('button', { name: 'Enter AR' })).toBeEnabled()
  })

  test('the auto button enters passthrough on a Quest 3', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter AR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true, mode: 'immersive-ar' })
    await scene.expectText('Passthrough')
    expect(await scene.renderState()).toEqual({ clearAlpha: 0, background: false })
    await expect(page.getByRole('button', { name: 'Exit' })).toBeVisible()
  })
})

test.describe('a lazy follow panel', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter AR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('starts in front of the viewer and comes back after a turn', async ({ scene }) => {
    const start = await scene.seenAt('#hud')
    expect(start.angle).toBeLessThan(2)
    expect(start.distance).toBeCloseTo(0.9, 1)
    expect(start.height).toBeCloseTo(-0.35, 1)

    // A small look around: it stays where it is.
    const placed = await scene.worldCenter('#hud')
    await scene.turnHead(15)
    await scene.page.evaluate(() => window.__xrTest!.frames(20))
    expect(await scene.worldCenter('#hud')).toEqual(placed)

    // A real turn: it glides back in front and settles.
    await scene.turnHead(90)
    await expect.poll(async () => (await scene.seenAt('#hud')).angle).toBeLessThan(2)
    await scene.expectText('Settled')
  })

  test('stays put when pinned', async ({ scene }) => {
    await scene.rayClick('right', 'Follow me')
    await scene.expectText('Pinned')
    const before = await scene.worldCenter('#hud')
    await scene.turnHead(90)
    await scene.page.evaluate(() => window.__xrTest!.frames(30))
    expect(await scene.worldCenter('#hud')).toEqual(before)
  })

  test('jumps in front again after a recentre', async ({ scene }) => {
    await scene.turnHead(120)
    await scene.recenter()
    await expect.poll(async () => (await scene.seenAt('#hud')).angle).toBeLessThan(2)
  })
})

test('a billboard turns to face the viewer', async ({ scene, page }) => {
  await scene.emulatorReady()
  await page.getByRole('button', { name: 'Enter AR' }).click()
  await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  await expect.poll(() => scene.facingAngle('#tag')).toBeLessThan(1)
  // Step to the side and crouch: it turns and tilts after you.
  await scene.moveHead([-0.6, 1.1, -0.2])
  await expect.poll(() => scene.facingAngle('#tag')).toBeLessThan(1)
})
