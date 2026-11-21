import { expect, test, type Scene } from './fixtures'

// The playground's Theme tab: "Delete…" opens <XrDialog title="Delete
// everything?"> with Cancel / Delete actions. Delete resets the count and
// says "Deleted"; any other way out says "Kept".

async function openDialog(scene: Scene, how: (label: string) => Promise<void>) {
  await how('Theme')
  await scene.expectText('Danger zone')
  await how('Delete…')
  await expect.poll(() => scene.isShown('Delete everything?')).toBe(true)
}

async function expectClosed(scene: Scene, status: string) {
  await expect.poll(() => scene.isShown('Delete everything?')).toBe(false)
  await scene.expectText(status)
}

test.describe('dialog in the browser', () => {
  test('mouse: open, confirm with an action', async ({ scene }) => {
    await scene.click('Increment')
    await scene.expectText('Count: 1')
    await openDialog(scene, (l) => scene.click(l))
    await scene.click('Delete')
    await expectClosed(scene, 'Deleted')
    await scene.click('Controls')
    await scene.expectText('Count: 0')
  })

  test('closes on the Close button, Escape and the backdrop, and blocks what is behind', async ({ scene, page }) => {
    await openDialog(scene, (l) => scene.click(l))
    await scene.click('#close')
    await expectClosed(scene, 'Kept')

    await scene.click('Delete…')
    await expect.poll(() => scene.isShown('Delete everything?')).toBe(true)
    await page.keyboard.press('Escape')
    await expect.poll(() => scene.isShown('Delete everything?')).toBe(false)

    await scene.click('Delete…')
    await expect.poll(() => scene.isShown('Delete everything?')).toBe(true)
    // A drag across the backdrop is not a press outside.
    await scene.mouseDragBy('Danger zone', 120, 0)
    await page.waitForTimeout(300)
    expect(await scene.isShown('Delete everything?')).toBe(true)
    // The card under the dialog is behind the backdrop: a press there
    // closes the dialog.
    await scene.click('Danger zone')
    await expect.poll(() => scene.isShown('Delete everything?')).toBe(false)
    await scene.click('Delete…')
    await expect.poll(() => scene.isShown('Delete everything?')).toBe(true)
    // "Delete…" itself is behind it too: pressing it closes, not reopens.
    await scene.click('Delete…')
    await expect.poll(() => scene.isShown('Delete everything?')).toBe(false)
    await page.waitForTimeout(300)
    expect(await scene.isShown('Delete everything?')).toBe(false)
  })
})

test.describe('dialog in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('controller ray opens it and presses Cancel', async ({ scene }) => {
    await openDialog(scene, (l) => scene.rayClick('right', l))
    await scene.rayClick('right', 'Cancel')
    await expectClosed(scene, 'Kept')
  })

  test('controller ray on the backdrop closes it', async ({ scene }) => {
    await openDialog(scene, (l) => scene.rayClick('right', l))
    // The test hook aims from 40 cm in front of the target, so aim at the
    // backdrop itself, beside the dialog (a card behind it would put the
    // controller past the backdrop).
    await scene.rayClick('right', '#backdrop', { fx: 0.43 })
    await expectClosed(scene, 'Kept')
  })

  test('a fingertip opens it and presses Delete', async ({ scene }) => {
    await scene.setInputMode('hand')
    await openDialog(scene, (l) => scene.poke('right', l))
    await scene.poke('right', 'Delete')
    await expectClosed(scene, 'Deleted')
  })
})
