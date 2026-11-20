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
    for (const key of ['#key-y', '#key-o']) await scene.poke('right', key)
    await scene.poke('left', '#key-backspace')
    await scene.poke('right', '#key-e')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('ye')
  })
})
