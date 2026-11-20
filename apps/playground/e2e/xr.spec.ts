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

  test('enters an AR session', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter AR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true, mode: 'immersive-ar' })
    await scene.expectText('In session: immersive-ar')
  })

  test('controller ray + trigger clicks a button', async ({ scene, page }) => {
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })

    await scene.rayClick('right', 'Increment')
    await scene.expectText('Count: 1')
    await scene.rayClick('left', 'Increment')
    await scene.expectText('Count: 2')
  })
})
