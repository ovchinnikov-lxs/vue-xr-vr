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

  test('controller ray on the backdrop closes it', async ({ scene, page }) => {
    await openDialog(scene, (l) => scene.rayClick('right', l))
    // Aim beside the dialog: the ray goes on into the backdrop around the head.
    await page.evaluate(() => window.__xrTest!.aim('right', '#dialog', -0.4))
    await page.evaluate(() => window.__xrTest!.frames(2))
    await page.evaluate(() => window.__xrTest!.pullTrigger('right'))
    await expectClosed(scene, 'Kept')
  })

  test('the backdrop dims the whole scene, behind the viewer too', async ({ scene, page }) => {
    await openDialog(scene, (l) => scene.rayClick('right', l))
    // The backdrop is drawn around the head: turning around, the scene is still dimmed.
    const backdrop = await page.evaluate(() => {
      const shell = window.__xrTest!.object('backdrop')
      return shell
    })
    expect(backdrop).toMatchObject({ inScene: true })
    const head = await page.evaluate(() => window.__xrTest!.head().position)
    expect(Math.hypot(...backdrop!.position.map((v, i) => v - head[i]!))).toBeLessThan(0.05)
    await page.evaluate(() => window.__xrTest!.moveHead([1.5, 1.6, 0.5]))
    await page.evaluate(() => window.__xrTest!.frames(3))
    const moved = await page.evaluate(() => window.__xrTest!.object('backdrop'))
    expect(Math.hypot(...moved!.position.map((v, i) => v - [1.5, 1.6, 0.5][i]!))).toBeLessThan(0.1)
    await scene.rayClick('right', 'Cancel')
    await expectClosed(scene, 'Kept')
    expect(await page.evaluate(() => window.__xrTest!.object('backdrop'))).toMatchObject({ inScene: false })
  })

  test('a fingertip opens it and presses Delete', async ({ scene }) => {
    await scene.setInputMode('hand')
    await openDialog(scene, (l) => scene.poke('right', l))
    await scene.poke('right', 'Delete')
    await expectClosed(scene, 'Deleted')
  })
})

// The Type tab's trash button (#clear) opens "Clear history?" (with its own
// field, #note) over the message field (#message); its Clear opens "Really
// clear?" in front of it.

test.describe('dialog focus and stacking', () => {
  test('fields behind an open dialog cannot take focus; focus comes back on close', async ({ scene, page }) => {
    await scene.click('Type')
    await expect.poll(() => scene.isShown('#key-q')).toBe(true)
    await scene.click('#message')
    await expect.poll(async () => (await scene.inputState('#message')).focused).toBe(true)
    await page.keyboard.type('hi')
    await expect.poll(async () => (await scene.inputState('#message')).value).toBe('hi')

    await scene.click('#clear')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(true)
    expect((await scene.inputState('#message')).focused).toBe(false)
    // Typing, Tab, and a focus() call on the hidden input all stay away from the field behind.
    await page.keyboard.type('x')
    await page.keyboard.press('Tab')
    await page.keyboard.type('y')
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('input')) el.focus()
    })
    await page.keyboard.type('z')
    await page.waitForTimeout(200)
    expect((await scene.inputState('#message')).value).toBe('hi')
    expect((await scene.inputState('#message')).focused).toBe(false)

    // The dialog's own field works.
    await scene.click('#note')
    await expect.poll(async () => (await scene.inputState('#note')).focused).toBe(true)
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('ok')
    await expect.poll(async () => (await scene.inputState('#note')).value).toBe('ok')

    await scene.click('#clear-cancel')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(false)
    // The on-screen keyboard types into the message field again.
    await scene.click('#key-q')
    await expect.poll(async () => (await scene.inputState('#message')).value).toBe('hiq')
  })

  test('a field inside a closed dialog does not keep the focus', async ({ scene, page }) => {
    await scene.click('Type')
    await scene.click('#clear')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(true)
    await scene.click('#note')
    await expect.poll(async () => (await scene.inputState('#note')).focused).toBe(true)
    await page.keyboard.press('Escape')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(false)
    await expect.poll(async () => (await scene.inputState('#note')).focused).toBe(false)
    // The on-screen keyboard has no target now: it types nowhere.
    await scene.click('#key-q')
    await page.waitForTimeout(200)
    expect((await scene.inputState('#note')).value).toBe('')
  })

  test('a dialog over a dialog opens in front, and Escape closes only the topmost', async ({ scene, page }) => {
    await scene.click('Type')
    await scene.click('#clear')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(true)
    await scene.click('Clear')
    await expect.poll(() => scene.isShown('Really clear?')).toBe(true)
    // Nearer to the viewer (the camera looks down -z).
    const [, , zFirst] = await scene.worldCenter('Clear history?')
    const [, , zSecond] = await scene.worldCenter('Really clear?')
    expect(zSecond).toBeGreaterThan(zFirst + 0.05)

    await page.keyboard.press('Escape')
    await expect.poll(() => scene.isShown('Really clear?')).toBe(false)
    await page.waitForTimeout(200)
    expect(await scene.isShown('Clear history?')).toBe(true)
    await page.keyboard.press('Escape')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(false)
  })
})

test.describe('stacked dialogs in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
  })

  test('the ray reaches the dialog in front, then the one under it', async ({ scene }) => {
    await scene.rayClick('right', 'Type')
    await scene.rayClick('right', '#clear')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(true)
    await scene.rayClick('right', 'Clear')
    await expect.poll(() => scene.isShown('Really clear?')).toBe(true)
    await scene.rayClick('right', 'Keep')
    await expect.poll(() => scene.isShown('Really clear?')).toBe(false)
    expect(await scene.isShown('Clear history?')).toBe(true)
    await scene.rayClick('right', '#clear-cancel')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(false)
  })

  test('the keyboard types into a field inside the dialog, through the backdrop', async ({ scene }) => {
    await scene.rayClick('right', 'Type')
    await scene.rayClick('right', '#clear')
    await expect.poll(() => scene.isShown('Clear history?')).toBe(true)
    await scene.rayClick('right', '#note')
    await expect.poll(async () => (await scene.inputState('#note')).focused).toBe(true)
    for (const key of ['#key-o', '#key-k']) await scene.rayClick('right', key)
    await expect.poll(async () => (await scene.inputState('#note')).value).toBe('ok')
    expect(await scene.isShown('Clear history?')).toBe(true)
  })
})
