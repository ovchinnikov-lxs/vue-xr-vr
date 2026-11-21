import { describe, expect, it } from 'vitest'
import { keyboardLayouts } from '../src/components/XrKeyboard'

describe('built-in keyboard layouts', () => {
  const entries = Object.entries(keyboardLayouts)

  it('ships en, ru, uk, de, fr, es', () => {
    expect(Object.keys(keyboardLayouts).sort()).toEqual(['de', 'en', 'es', 'fr', 'ru', 'uk'])
  })

  it.each(entries)('%s has a label, a locale and three rows of single characters', (_name, layout) => {
    expect(layout.label).toMatch(/^[A-Z]{2}$/)
    expect(layout.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
    expect(layout.rows).toHaveLength(3)
    for (const row of layout.rows) expect([...row].length).toBeGreaterThan(5)
  })

  it.each(entries)('%s has no duplicate keys', (_name, layout) => {
    const keys = layout.rows.flatMap((row) => [...row])
    expect(new Set(keys).size).toBe(keys.length)
  })
})
