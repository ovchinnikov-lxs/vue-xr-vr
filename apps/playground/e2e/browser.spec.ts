import { expect, test } from './fixtures'

test.describe('in the browser', () => {
  test('lays out the panel and its text', async ({ scene }) => {
    expect(await scene.texts()).toEqual(
      expect.arrayContaining(['vue-xr-ui', 'Count: 0', 'In the browser', 'Increment', 'Reset', 'Theme']),
    )
    const [width, height] = (await scene.size('Increment'))!
    // Buttons never go below the theme's 48 dmm minimum target.
    expect(height).toBeGreaterThanOrEqual(48)
    expect(width).toBeGreaterThanOrEqual(48)
  })

  test('mouse click fires the button', async ({ scene }) => {
    await scene.click('Increment')
    await scene.expectText('Count: 1')
    await scene.click('Increment')
    await scene.expectText('Count: 2')
  })

  test('disabled button ignores clicks', async ({ scene, page }) => {
    await scene.click('Reset')
    await page.waitForTimeout(300)
    expect(await scene.texts()).toContain('Count: 0')

    await scene.click('Increment')
    await scene.expectText('Count: 1')
    await scene.click('Reset')
    await scene.expectText('Count: 0')
  })
})
