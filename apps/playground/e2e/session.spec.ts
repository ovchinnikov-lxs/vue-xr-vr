import { expect, test } from './fixtures'

// Ways out of a session: <XrExitButton name="exit"> in the main window's
// header (only while presenting), and <XrSessionMenu> (App.vue), which a
// palm pinch opens: "Leave VR?" with Stay / Exit VR.

test.describe('leaving a session', () => {
  test.beforeEach(async ({ scene }) => {
    await scene.emulatorReady()
  })

  test('the exit button shows only in a session, and a ray on it ends the session', async ({ scene, page }) => {
    expect(await scene.isShown('#exit')).toBe(false)
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    // Sharp text: native resolution and no fixed foveation by default.
    expect((await scene.renderState()).foveation).toBe(0)
    await expect.poll(() => scene.isShown('Exit VR')).toBe(true)
    await scene.rayClick('right', 'Exit VR')
    await expect.poll(() => scene.state()).toMatchObject({ presenting: false })
    await scene.expectText('In the browser')
    expect(await scene.isShown('#exit')).toBe(false)
  })

  test('a fingertip pokes the exit button', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await scene.setInputMode('hand')
    await expect.poll(() => scene.isShown('#exit')).toBe(true)
    await scene.poke('right', '#exit')
    await expect.poll(() => scene.state()).toMatchObject({ presenting: false })
  })

  test('a left palm pinch asks to leave: Stay keeps the session, Exit VR ends it', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await scene.setInputMode('hand')

    // A pinch with the palm down is a normal pinch: no menu.
    await scene.poseHand('left', [-0.1, 1.15, -0.35], [0, 0, 0])
    await page.evaluate(() => window.__xrTest!.pinch('left'))
    await page.evaluate(() => window.__xrTest!.frames(5))
    expect(await scene.isShown('Leave VR?')).toBe(false)

    // Palm toward the face, pinch: the menu opens in front of the viewer.
    await scene.poseHand('left', [-0.1, 1.15, -0.35], [50, 0, 180])
    await page.evaluate(() => window.__xrTest!.pinch('left'))
    await expect.poll(() => scene.isShown('Leave VR?')).toBe(true)
    // The opening pinch does not answer it.
    await page.evaluate(() => window.__xrTest!.frames(10))
    expect(await scene.state()).toMatchObject({ presenting: true })

    await scene.poseHand('left', [-0.1, 1.15, -0.35], [0, 0, 0])
    await scene.poke('right', '#session-stay')
    await expect.poll(() => scene.isShown('Leave VR?')).toBe(false)
    expect(await scene.state()).toMatchObject({ presenting: true })

    await scene.poseHand('left', [-0.1, 1.15, -0.35], [50, 0, 180])
    await page.evaluate(() => window.__xrTest!.pinch('left'))
    await expect.poll(() => scene.isShown('Leave VR?')).toBe(true)
    await scene.poseHand('left', [-0.1, 1.15, -0.35], [0, 0, 0])
    await scene.poke('right', '#session-exit')
    await expect.poll(() => scene.state()).toMatchObject({ presenting: false })
  })

  test('the right hand palm pinch does not open the menu (the Quest system gesture is there)', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await scene.setInputMode('hand')
    await scene.poseHand('right', [0.1, 1.15, -0.35], [50, 0, 180])
    await page.evaluate(() => window.__xrTest!.pinch('right'))
    await page.evaluate(() => window.__xrTest!.frames(10))
    expect(await scene.isShown('Leave VR?')).toBe(false)
  })
})
