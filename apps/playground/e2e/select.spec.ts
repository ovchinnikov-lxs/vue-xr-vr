import { expect, test, type Scene } from './fixtures'

// The playground's List tab: <XrSelect name="artist"> filters the tracks
// below it, and its options open over that track list. Choosing a track
// would say "Playing: …" instead of "Pick a track".

const options = '#artist.options'

async function openSelect(scene: Scene, press: (label: string) => Promise<void>) {
  await press('List')
  await scene.expectText('Pick a track')
  await press('#artist.trigger')
  await expect.poll(() => scene.isShown(options)).toBe(true)
}

async function expectChosen(scene: Scene, artist: string, shownTrack: string, hiddenTrack?: string) {
  await expect.poll(() => scene.isShown(options)).toBe(false)
  await expect.poll(() => scene.isShown(shownTrack)).toBe(true)
  if (hiddenTrack) expect(await scene.isShown(hiddenTrack)).toBe(false)
  await scene.expectText(artist)
  // The option was over a track: the press went to the option only.
  await scene.expectText('Pick a track')
}

test.describe('select in the browser', () => {
  test('mouse: open, choose an option over the list behind it', async ({ scene }) => {
    await openSelect(scene, (l) => scene.click(l))
    // Options are laid out from the top: Night Ferry sits over the tracks.
    await scene.click('Night Ferry')
    await expectChosen(scene, 'Night Ferry', 'Track 2', 'Track 1')

    await scene.click('#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(true)
    await scene.click('All artists')
    await expectChosen(scene, 'All artists', 'Track 1')
  })

  test('closes on the field, Escape, a press outside and empty space', async ({ scene, page }) => {
    await openSelect(scene, (l) => scene.click(l))
    await scene.click('#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(false)

    await scene.click('#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(true)
    await page.keyboard.press('Escape')
    await expect.poll(() => scene.isShown(options)).toBe(false)

    await scene.click('#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(true)
    await scene.click('Pick a track')
    await expect.poll(() => scene.isShown(options)).toBe(false)

    await scene.click('#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(true)
    // The top-left corner of the canvas is sky: the ray hits nothing.
    await page.mouse.click(5, 5)
    await expect.poll(() => scene.isShown(options)).toBe(false)
    await scene.expectText('All artists')
  })
})

test.describe('select in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('controller ray opens it, chooses, and a press outside closes it', async ({ scene }) => {
    await openSelect(scene, (l) => scene.rayClick('right', l))
    await scene.rayClick('right', 'Glasshouse')
    await expectChosen(scene, 'Glasshouse', 'Track 3', 'Track 1')

    await scene.rayClick('right', '#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(true)
    await scene.rayClick('right', 'Pick a track')
    await expect.poll(() => scene.isShown(options)).toBe(false)
  })

  test('a fingertip opens it, chooses, and a poke outside closes it', async ({ scene }) => {
    await scene.setInputMode('hand')
    await openSelect(scene, (l) => scene.poke('right', l))
    await scene.poke('right', 'Night Ferry')
    await expectChosen(scene, 'Night Ferry', 'Track 2', 'Track 1')

    // Pulling the finger back after opening must not close it.
    await scene.poke('right', '#artist.trigger')
    await expect.poll(() => scene.isShown(options)).toBe(true)
    // A poke on other UI does (the tab already open: it changes nothing else).
    await scene.poke('right', 'List')
    await expect.poll(() => scene.isShown(options)).toBe(false)
  })
})
