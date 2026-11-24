import { expect, test, type Scene } from './fixtures'

// The playground's Form tab: icon buttons (#like, #alerts: icon only;
// #share: icon + label) with captions that say what they did.

async function openForm(scene: Scene, press: (label: string) => Promise<void>) {
  await press('Form')
  await scene.expectText('Not liked')
}

test.describe('form controls in the browser', () => {
  test('icon buttons: icon-only ones are round, all of them click', async ({ scene }) => {
    await openForm(scene, (l) => scene.click(l))
    const [w, h] = (await scene.size('#like'))!
    expect(w).toBeCloseTo(h, 3)
    const [shareW, shareH] = (await scene.size('#share'))!
    expect(shareW).toBeGreaterThan(shareH * 1.5)

    await scene.click('#like')
    await scene.expectText('Liked')
    await scene.click('#alerts')
    await scene.expectText('Alerts off')
    // The icon itself is not a target of its own: a click on it is a click on the button.
    await scene.click('#share', 0.25)
    await scene.click('#share', 0.75)
    await scene.expectText('Shares: 2')
  })
})

test.describe('form controls in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('controller ray presses icon buttons', async ({ scene }) => {
    await openForm(scene, (l) => scene.rayClick('right', l))
    await scene.rayClick('right', '#like')
    await scene.expectText('Liked')
    await scene.rayClick('right', '#share')
    await scene.expectText('Shares: 1')
  })

  test('a fingertip pokes icon buttons', async ({ scene }) => {
    await scene.setInputMode('hand')
    await openForm(scene, (l) => scene.poke('right', l))
    await scene.poke('right', '#alerts')
    await scene.expectText('Alerts off')
    await scene.poke('right', '#like')
    await scene.expectText('Liked')
  })
})

// Checkboxes: "All rooms" (#all-rooms) over Kitchen (on) and Bedroom (off),
// so it starts indeterminate. Radio group #quality: Low / Medium / High.

const allRoomsMark = '#all-rooms.box.mark'

test.describe('checkbox and radio group in the browser', () => {
  test('mouse: the parent checkbox follows its children, the radio group picks one', async ({ scene }) => {
    await openForm(scene, (l) => scene.click(l))
    // Indeterminate: a dash, 14 dmm wide.
    expect((await scene.size(allRoomsMark))![0]).toBeCloseTo(14, 0)
    await scene.click('Bedroom')
    // All on: the dash becomes the 20 dmm check icon.
    await expect.poll(async () => (await scene.size(allRoomsMark))?.[0]).toBeCloseTo(20, 0)
    await scene.click('All rooms')
    await expect.poll(() => scene.isShown('#room-Kitchen.box.mark')).toBe(false)
    await expect.poll(() => scene.isShown(allRoomsMark)).toBe(false)
    await scene.click('All rooms')
    await expect.poll(() => scene.isShown('#room-Kitchen.box.mark')).toBe(true)

    await scene.expectText('Quality: High')
    await scene.click('Low')
    await scene.expectText('Quality: Low')
    await expect.poll(() => scene.isShown('#quality.dot')).toBe(true)
  })
})

test.describe('checkbox and radio group in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('controller ray checks and chooses', async ({ scene }) => {
    await openForm(scene, (l) => scene.rayClick('right', l))
    await scene.rayClick('right', 'Kitchen')
    await expect.poll(() => scene.isShown('#room-Kitchen.box.mark')).toBe(false)
    await scene.rayClick('right', 'Medium')
    await scene.expectText('Quality: Medium')
  })

  test('a fingertip checks and chooses', async ({ scene }) => {
    await scene.setInputMode('hand')
    await openForm(scene, (l) => scene.poke('right', l))
    await scene.poke('right', 'All rooms')
    await expect.poll(() => scene.isShown('#room-Bedroom.box.mark')).toBe(true)
    await scene.poke('right', 'Low')
    await scene.expectText('Quality: Low')
  })
})

// Progress: #sync (a bar driven by #sync-step, +25% a press), a spinner
// (#spinner) and an indeterminate bar (#loading).

async function fillFraction(scene: Scene, bar: string) {
  const fill = await scene.size(`${bar}.fill`)
  const track = await scene.size(`${bar}.track`)
  return (await scene.isShown(`${bar}.fill`)) ? fill![0] / track![0] : 0
}

test.describe('progress in the browser', () => {
  test('the bar fills with its value and shows the percentage', async ({ scene }) => {
    await openForm(scene, (l) => scene.click(l))
    await scene.expectText('0%')
    expect(await fillFraction(scene, '#sync')).toBe(0)
    await scene.click('+25%')
    await scene.expectText('25%')
    await expect.poll(() => fillFraction(scene, '#sync')).toBeCloseTo(0.25, 2)
    for (let i = 0; i < 3; i++) await scene.click('+25%')
    await scene.expectText('100%')
    await scene.expectText('Up to date')
    await expect.poll(() => fillFraction(scene, '#sync')).toBeCloseTo(1, 2)
    await scene.click('#sync-reset')
    await scene.expectText('0%')
  })

  test('the spinner and the indeterminate bar move', async ({ scene }) => {
    await openForm(scene, (l) => scene.click(l))
    const angles = new Set<unknown>()
    const lefts = new Set<unknown>()
    for (let i = 0; i < 6; i++) {
      angles.add(await scene.property('#spinner.ring', 'transformRotateZ'))
      lefts.add(await scene.property('#loading.fill', 'positionLeft'))
      await scene.page.waitForTimeout(120)
    }
    expect(angles.size).toBeGreaterThan(2)
    expect(lefts.size).toBeGreaterThan(2)
  })
})

test.describe('progress in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('keeps animating in a session, and the bar follows a ray press', async ({ scene }) => {
    await openForm(scene, (l) => scene.rayClick('right', l))
    const first = await scene.property('#loading.fill', 'positionLeft')
    await expect.poll(() => scene.property('#loading.fill', 'positionLeft')).not.toBe(first)
    await scene.rayClick('right', '+25%')
    await scene.expectText('25%')
  })
})
