import { expect, test } from './fixtures'

test.describe('in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await expect(page.getByRole('button', { name: 'Enter VR' })).toBeEnabled()
  })

  test('enters and exits a VR session', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true, mode: 'immersive-vr' })
    await scene.expectText('In session: immersive-vr')

    await scene.exit()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: false })
    await scene.expectText('In the browser')

    // The browser render loop is back: mouse input works again.
    await scene.click('Increment')
    await scene.expectText('Count: 1')
  })

  test('enters an AR session with passthrough', async ({ scene, page }) => {
    expect((await scene.renderState()).clearAlpha).toBe(1)
    await page.getByRole('button', { name: 'Enter AR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true, mode: 'immersive-ar' })
    await scene.expectText('In session: immersive-ar')
    // The room shows through wherever nothing is drawn.
    expect(await scene.renderState()).toMatchObject({ clearAlpha: 0, background: false })

    await scene.exit()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: false })
    expect((await scene.renderState()).clearAlpha).toBe(1)
  })

  test('a VR session keeps the opaque background', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true, mode: 'immersive-vr' })
    expect((await scene.renderState()).clearAlpha).toBe(1)
  })

  test('controller ray + trigger clicks a button', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })

    await scene.rayClick('right', 'Increment')
    await scene.expectText('Count: 1')
    await scene.rayClick('left', 'Increment')
    await scene.expectText('Count: 2')
  })

  test('a slow, held press still clicks', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    // People in a headset press deliberately; a long press is still a click.
    await scene.rayClick('right', 'Increment', { holdMs: 800 })
    await scene.expectText('Count: 1')
  })
})

test.describe('with tracked hands', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await scene.setInputMode('hand')
  })

  test('poking a button with a fingertip clicks it', async ({ scene }) => {
    await scene.poke('right', 'Increment')
    await scene.expectText('Count: 1')
    await scene.poke('left', 'Increment')
    await scene.expectText('Count: 2')
  })

  test('pinching while pointing clicks a button', async ({ scene }) => {
    await scene.pinchClick('right', 'Increment')
    await scene.expectText('Count: 1')
  })
})
