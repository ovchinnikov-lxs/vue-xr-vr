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
