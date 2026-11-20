import { expect, test } from './fixtures'

// The playground's settings row: <XrToggle v-model="sound">Sound</XrToggle>
// and <XrSlider v-model="volume" name="volume" :disabled="!sound" />, 0..100,
// starting at 40.

test.describe('toggle and slider in the browser', () => {
  test('mouse click flips the toggle, and the slider follows it', async ({ scene }) => {
    await scene.click('Sound')
    await scene.expectText('Muted')
    // Sound off disables the slider: clicks on it change nothing.
    await scene.click('#volume.track', 0.9)
    await scene.page.waitForTimeout(300)
    await scene.click('Sound')
    await scene.expectText('Volume: 40')

    await scene.click('#volume.track', 0.9)
    await scene.expectText('Volume: 90')
  })

  test('mouse drag moves the slider', async ({ scene }) => {
    await scene.mouseDrag('#volume.track', 0.4, 0.75)
    await scene.expectText('Volume: 75')
    await scene.mouseDrag('#volume.track', 0.75, 0)
    await scene.expectText('Volume: 0')
  })
})

test.describe('toggle and slider in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('controller ray flips the toggle and drags the slider', async ({ scene }) => {
    await scene.rayClick('right', 'Sound')
    await scene.expectText('Muted')
    await scene.rayClick('right', 'Sound')
    await scene.expectText('Volume: 40')

    await scene.rayDrag('right', '#volume.track', 0.4, 0.8)
    await scene.expectText('Volume: 80')
  })

  test('a fingertip taps the toggle and slides the slider', async ({ scene }) => {
    await scene.setInputMode('hand')
    await scene.poke('right', 'Sound')
    await scene.expectText('Muted')
    await scene.poke('right', 'Sound')
    await scene.expectText('Volume: 40')
    await scene.poke('left', '#volume.track', 0.4, 0.2)
    await scene.expectText('Volume: 20')
  })
})
