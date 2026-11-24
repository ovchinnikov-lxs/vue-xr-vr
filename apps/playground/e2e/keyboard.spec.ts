import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Playground: the "Type" tab has <XrTextField name="message"> and opens a
// second window with <XrKeyboard name="keyboard"> (keys are named
// `key-<char>`, `key-shift`, `key-backspace`, `key-layout`, `key-enter`).
// Enter sends the message into a list of `sent` texts. The "Theme" tab has
// accent swatches (`accent-<hex>`) and a "Danger zone" card with its own accent.

const field = '#message'

/**
 * Types like Quest's system keyboard: it changes the hidden <input> and
 * fires `input`, but moves the selection only after that event, with no
 * event of its own.
 */
async function typeLikeSystemKeyboard(page: Page, text: string) {
  await page.evaluate((text) => {
    const el = document.activeElement as HTMLInputElement
    const caret = el.selectionStart ?? el.value.length
    el.value = el.value.slice(0, caret) + text + el.value.slice(caret)
    el.setSelectionRange(caret, caret)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.setSelectionRange(caret + text.length, caret + text.length)
  }, text)
}

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
    // One character goes on the press; on a slow CI frame the press itself lands a little later.
    await expect.poll(async () => (await scene.inputState(field)).value, { intervals: [20] }).toBe('hello worl')
    await expect.poll(async () => (await scene.inputState(field)).value.length).toBeLessThan(8)
    await page.mouse.up()
    // The release reaches the scene on its next frame; a slow machine can repeat once more before that.
    await page.evaluate(() => window.__xrTest!.frames(3))
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

  test('the caret follows text typed by a system keyboard', async ({ scene, page }) => {
    await scene.click(field)
    await expect.poll(async () => (await scene.inputState(field)).focused).toBe(true)
    await typeLikeSystemKeyboard(page, 'abc')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('abc')
    await expect.poll(async () => (await scene.inputState(field)).selection).toEqual([3, 3])
    // The next key goes after the caret, and so does our keyboard's.
    await typeLikeSystemKeyboard(page, 'd')
    await scene.click('#key-e')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('abcde')
    await expect.poll(async () => (await scene.inputState(field)).selection).toEqual([5, 5])
  })
})

test.describe('voice input', () => {
  test.beforeEach(async ({ scene }) => {
    await scene.click('Type')
    await expect.poll(() => scene.isShown('#key-voice')).toBe(true)
  })

  test('the mic key dictates in the layout language, after a space', async ({ scene, page }) => {
    await scene.click(field)
    await scene.click('#key-h')
    await scene.click('#key-i')
    await scene.click('RU')
    await expect.poll(() => scene.isShown('#key-д')).toBe(true)
    const idle = await scene.background('#key-voice')

    await scene.click('#key-voice')
    await scene.expectText('привет')
    expect(await scene.background('#key-voice')).not.toBe(idle)
    expect(await page.evaluate(() => (window as unknown as { __fakeSpeech: { lang: string } }).__fakeSpeech.lang)).toBe('ru-RU')

    await scene.click('#key-voice')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('hi привет мир')
    await page.mouse.move(5, 5) // off the key, so it is not drawn hovered
    await expect.poll(() => scene.background('#key-voice')).toBe(idle)
    await scene.expectText('Русский')
  })

  test('a voice error shows on the space bar', async ({ scene, page }) => {
    await page.evaluate(() => ((window as unknown as { __fakeSpeech: { fail: string } }).__fakeSpeech.fail = 'not-allowed'))
    await scene.click(field)
    await scene.click('#key-voice')
    await scene.expectText('Microphone not allowed')
    expect((await scene.inputState(field)).value).toBe('')
  })
})

test.describe('themes', () => {
  test('an accent recolours the app, but not the card with its own theme', async ({ scene }) => {
    await scene.click('Theme')
    await scene.expectText('Danger zone')
    const danger = await scene.background('Delete…')

    await scene.click('#accent-#22c55e')
    await expect.poll(() => scene.background('Theme')).toBe('#22c55e')
    expect(await scene.background('Delete…')).toBe(danger)

    await scene.click('Light')
    await expect.poll(() => scene.background('Theme')).toBe('#22c55e')
    expect(await scene.background('Delete…')).toBe('#f43f5e')
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

  test('a ray presses the mic key', async ({ scene }) => {
    await scene.rayClick('right', field)
    await scene.rayClick('right', '#key-voice')
    await scene.expectText('привет')
    await scene.rayClick('right', '#key-voice')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('привет мир')
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

test.describe('Quest system keyboard', () => {
  test.beforeEach(async ({ scene, page }) => {
    await scene.emulatorReady()
    // Quest Browser's sessions say they have a system keyboard; IWER's don't.
    await page.evaluate(() => {
      const xr = navigator.xr!
      const request = xr.requestSession.bind(xr)
      xr.requestSession = async (...args) => {
        const session = await request(...args)
        Object.defineProperty(session, 'isSystemKeyboardSupported', { value: true })
        return session
      }
    })
    await page.getByRole('button', { name: 'Enter VR' }).click()
    await expect.poll(() => scene.state()).toMatchObject({ presenting: true })
    await scene.rayClick('right', 'Type')
    await scene.expectText('Tap the field: the headset keyboard opens. Enter sends.')
  })

  test('our keyboard stays hidden and the system keyboard types with the caret after the text', async ({ scene, page }) => {
    expect(await scene.isShown('#key-q')).toBe(false)
    await scene.rayClick('right', field)
    await expect.poll(async () => (await scene.inputState(field)).focused).toBe(true)
    await typeLikeSystemKeyboard(page, 'hi')
    await typeLikeSystemKeyboard(page, '!')
    await expect.poll(async () => (await scene.inputState(field)).value).toBe('hi!')
    await expect.poll(async () => (await scene.inputState(field)).selection).toEqual([3, 3])
    expect(await scene.isShown('#key-q')).toBe(false)
  })
})
