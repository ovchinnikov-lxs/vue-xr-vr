import { expect, test } from './fixtures'

// The mixed reality scene (src/scenes/MixedReality.vue) in the emulated
// Quest 3, in IWER's scanned living room: passthrough, planes, anchors.
// (The furnished rooms such as `kitchen` render at ~2 fps in CI's software
// GL; the scanned ones at ~10.) Its front wall is at z = -2.46, a table's
// top at y = 0.78 around (-1.53, -1.19).
test.use({ scenePath: '/?e2e&scene=mr&room=living_room', readyLabel: 'Mixed reality' })

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

test.describe('snapping to the room', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter AR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await expect.poll(async () => (await scene.planes()).length).toBeGreaterThan(5)
  })

  test('a window carried to a wall lies flat on it, and comes off again', async ({ scene }) => {
    const before = await scene.worldCenter('#note')
    await scene.rayCarry('right', '#note.handle', [0, 0, -1.3])
    await scene.expectText('On the wall')
    const [x, , z] = await scene.worldCenter('#note')
    expect(z).toBeCloseTo(-2.45, 1)
    expect(x).toBeCloseTo(before[0], 1)
    // Facing into the room, straight out of the wall.
    expect(Math.abs(await scene.yaw('#note'))).toBeLessThan(0.05)

    await scene.rayCarry('right', '#note.handle', [0, 0, 0.6])
    await scene.expectText('Was on the wall')
    expect((await scene.worldCenter('#note'))[2]).toBeGreaterThan(-2.2)
  })

  test('a window carried to a table stands on it', async ({ scene }) => {
    const [x, y, z] = await scene.worldCenter('#note')
    await scene.rayCarry('right', '#note.handle', [-1.53 - x, 0.95 - y, -1.19 - z])
    await scene.expectText('On the table')
    const bottom = await scene.bottom('#note')
    expect(bottom).toBeCloseTo(0.78, 1)
  })
})

test.describe('anchors', () => {
  const saved = (page: import('@playwright/test').Page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('vue-xr-ui:anchors') ?? '{}') as Record<string, { handle?: string; pose?: number[] }>)
  const enterAR = async (scene: import('./fixtures').Scene) => {
    await scene.emulatorReady()
    await scene.page.getByRole('button', { name: 'Enter AR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  }
  const reload = async (scene: import('./fixtures').Scene) => {
    await scene.page.reload()
    await scene.ready('Mixed reality')
  }
  const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]!) < 0.02)

  test('a window put down comes back there next session, until forgotten', async ({ scene, page }) => {
    await enterAR(scene)
    const start = await scene.worldCenter('#note')
    await scene.rayCarry('right', '#note.handle', [-0.25, 0.15, 0])
    const put = await scene.worldCenter('#note')
    // A persistent anchor on the (emulated) headset, and the pose as a fallback.
    await expect.poll(async () => (await saved(page)).note?.handle).toBeTruthy()

    await scene.exit()
    await reload(scene)
    // In the browser the saved pose places it.
    await expect.poll(async () => near(await scene.worldCenter('#note'), put)).toBe(true)
    await enterAR(scene)
    await scene.page.evaluate(() => window.__xrTest!.frames(5))
    expect(near(await scene.worldCenter('#note'), put)).toBe(true)


    // In a session the headset's persistent anchor wins over the stored
    // pose: spoil the pose, and the anchor still brings it back.
    await scene.exit()
    await page.evaluate(() => {
      const all = JSON.parse(localStorage.getItem('vue-xr-ui:anchors')!)
      all.note.pose[13] += 0.5 // y
      localStorage.setItem('vue-xr-ui:anchors', JSON.stringify(all))
    })
    await reload(scene)
    await expect.poll(async () => (await scene.worldCenter('#note'))[1]).toBeCloseTo(put[1] + 0.5, 2)
    await enterAR(scene)
    await expect.poll(async () => near(await scene.worldCenter('#note'), put)).toBe(true)

    await scene.rayClick('right', 'Forget note place')
    await expect.poll(async () => (await saved(page)).note).toBeUndefined()
    await scene.exit()
    await reload(scene)
    expect(near(await scene.worldCenter('#note'), start)).toBe(true)
  })

  test('XrAnchor keeps a card where it was pinned', async ({ scene, page }) => {
    const start = await scene.worldCenter('#card')
    await scene.click('Nudge')
    await expect.poll(async () => (await scene.worldCenter('#card'))[0]).toBeCloseTo(start[0] + 0.1, 2)
    await scene.click('Pin here')
    await scene.expectText('Pinned card')
    expect((await saved(page)).card?.pose).toHaveLength(16)

    // Reloaded, the nudge is gone but the pin holds; in a session too.
    await reload(scene)
    await expect.poll(async () => (await scene.worldCenter('#card'))[0]).toBeCloseTo(start[0] + 0.1, 2)
    await enterAR(scene)
    await scene.rayClick('right', 'Unpin')
    await scene.expectText('Loose card')
    await expect.poll(async () => (await scene.worldCenter('#card'))[0]).toBeCloseTo(start[0], 2)
  })
})
