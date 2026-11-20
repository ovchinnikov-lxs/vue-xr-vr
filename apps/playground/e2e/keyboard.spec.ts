import { expect, test } from './fixtures'

// Playground: the "Type" tab has <XrTextField name="message"> and opens a
// second window with <XrKeyboard name="keyboard"> (keys are named
// `key-<char>`, `key-shift`, `key-backspace`, `key-layout`, `key-enter`).
// Enter sends the message into a list of `sent` texts. The "Theme" tab has
// accent swatches (`accent-<hex>`) and a "Danger zone" card with its own accent.

const field = '#message'

test.describe('text field and keyboard in the browser', () => {
  test.beforeEach(async ({ scene }) => {
    await scene.click('Type')
    await expect.poll(() => scene.isShown('#key-q')).toBe(true)
  })

  test('the keyboard types into the focused field, with shift, backspace and Russian', async ({ scene }) => {
    await scene.click(field)
    await expect.poll(async () => (await scene.inputState(field)).focused).toBe(true)

    for (const key of ['#key-shift', '#key-h', '#key-i', '#key-space', '#key-x', '#key-backspace']) await scene.click(key)
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('Hi ')

    await scene.click('#key-layout')
    await scene.expectText('RU')
    for (const key of ['#key-п', '#key-р', '#key-и']) await scene.click(key)
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('Hi при')
    // The field is still focused after clicking keys (the caret shows).
    expect((await scene.inputState(field)).focused).toBe(true)

    await scene.click('#key-enter')
    await scene.expectText('Hi при')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('')
  })

  test('the language tabs pick the layout; ?123 opens symbols', async ({ scene }) => {
    await scene.click(field)
    await scene.click('UK')
    await expect.poll(() => scene.isShown('#key-ї')).toBe(true)
    for (const key of ['#key-shift', '#key-ї']) await scene.click(key)
    await scene.click('FR')
    await expect.poll(() => scene.isShown('#key-ç')).toBe(true)
    await scene.click('#key-ç')
    await scene.click('#key-symbols')
    await expect.poll(() => scene.isShown('#key-@')).toBe(true)
    expect(await scene.isShown('#key-shift')).toBe(true)
    await scene.click('#key-@')
    await scene.click('ABC')
    await expect.poll(() => scene.isShown('#key-a')).toBe(true)
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('Їç@')
    // The layout key cycles to the next language and moves the tabs with it.
    await scene.click('#key-layout')
    await expect.poll(() => scene.isShown('#key-ñ')).toBe(true)
    await scene.expectText('Español')
  })

  test('holding Backspace keeps deleting', async ({ scene, page }) => {
    await scene.click(field)
    await expect.poll(async () => (await scene.inputState(field)).focused).toBe(true)
    await page.keyboard.type('hello world')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('hello world')
    const key = await scene.screenPoint('#key-backspace')
    await page.mouse.move(key.x, key.y)
    await page.mouse.down()
    await page.waitForTimeout(100)
    expect((await scene.inputState(field)).value).toBe('hello worl')
    await expect.poll(async () => (await scene.inputState(field)).value.length).toBeLessThan(8)
    await page.mouse.up()
    const left = (await scene.inputState(field)).value
    await page.waitForTimeout(300)
    expect((await scene.inputState(field)).value).toBe(left)
  })

  test('a physical keyboard types into the field too', async ({ scene, page }) => {
    await scene.click(field)
    await expect.poll(async () => (await scene.inputState(field)).focused).toBe(true)
    await page.keyboard.type('hello')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('hello')
    // A virtual key inserts at the caret, not at the end.
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await scene.click('#key-x')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('helxlo')
    await page.keyboard.press('Enter')
    await scene.expectText('helxlo')
  })
})

test.describe('themes', () => {
  test('an accent recolours the app, but not the card with its own theme', async ({ scene }) => {
    await scene.click('Theme')
    await scene.expectText('Danger zone')
    const danger = await scene.background('Delete')

    await scene.click('#accent-#22c55e')
    await expect.poll(() => scene.background('Theme')).toBe('#22c55e')
    expect(await scene.background('Delete')).toBe(danger)

    await scene.click('Light')
    await expect.poll(() => scene.background('Theme')).toBe('#22c55e')
    expect(await scene.background('Delete')).toBe('#f43f5e')
  })
})

test.describe('keyboard in the emulated Quest 3', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await scene.rayClick('right', 'Type')
    await expect.poll(() => scene.isShown('#key-q')).toBe(true)
  })

  test('controller rays focus the field and type', async ({ scene }) => {
    await scene.rayClick('right', field)
    await expect.poll(async () => (await scene.inputState(field)).focused).toBe(true)
    for (const key of ['#key-o', '#key-k']) await scene.rayClick('right', key)
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('ok')
    await scene.rayClick('left', '#key-enter')
    await scene.expectText('ok')
  })

  test('fingertips type on the keyboard', async ({ scene }) => {
    await scene.rayClick('right', field)
    await scene.setInputMode('hand')
    // (A poke here is held for about ten frames, which on a slow machine is
    // long enough for Backspace to start repeating; held Backspace has its own test.)
    for (const key of ['#key-y', '#key-o']) await scene.poke('right', key)
    await scene.poke('left', '#key-u')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('you')
  })
})
