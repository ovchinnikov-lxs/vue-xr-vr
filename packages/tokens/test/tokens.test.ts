import { describe, expect, it } from 'vitest'
import { contrastRatio, darkTheme, defineTheme, lightTheme, pixelSizeAt, withAccent } from '../src'

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#4f7cff', '#4f7cff')).toBeCloseTo(1, 5)
  })

  it('is symmetric and accepts 3-digit hex', () => {
    expect(contrastRatio('#fff', '#123456')).toBeCloseTo(contrastRatio('#123456', '#ffffff'), 10)
  })

  it('rejects colours that are not hex', () => {
    expect(() => contrastRatio('red', '#fff')).toThrow(/hex color/)
  })
})

describe('withAccent', () => {
  it('sets the primary colour and derives hover, pressed and focus', () => {
    const t = withAccent(darkTheme, '#22c55e')
    expect(t.colors.primary).toBe('#22c55e')
    expect(t.colors.primaryHover).not.toBe(t.colors.primary)
    expect(t.colors.primaryActive).not.toBe(t.colors.primary)
    expect(t.colors.focusRing).not.toBe(t.colors.primary) // dark theme: a light tint
    expect(withAccent(lightTheme, '#22c55e').colors.focusRing).toBe('#22c55e')
  })

  it('picks readable text on the accent', () => {
    for (const accent of ['#4f7cff', '#22c55e', '#f59e0b', '#f43f5e', '#a855f7', '#ffff00', '#0a0a0a']) {
      const t = withAccent(darkTheme, accent)
      expect(contrastRatio(t.colors.primary, t.colors.onPrimary)).toBeGreaterThanOrEqual(3)
    }
  })

  it('leaves the rest of the theme alone', () => {
    const t = withAccent(darkTheme, '#22c55e')
    expect(t.colors.surface).toBe(darkTheme.colors.surface)
    expect(t.typography).toBe(darkTheme.typography)
  })
})

describe('defineTheme', () => {
  it('merges each group one level deep', () => {
    const t = defineTheme(darkTheme, { name: 'brand', radius: { md: 16 }, colors: { surface: '#101826' } })
    expect(t.name).toBe('brand')
    expect(t.radius.md).toBe(16)
    expect(t.radius.sm).toBe(darkTheme.radius.sm)
    expect(t.colors.surface).toBe('#101826')
    expect(t.colors.text).toBe(darkTheme.colors.text)
    expect(t.space).toBe(darkTheme.space)
  })
})

describe('themes', () => {
  it('button text is readable on the accent (at least 3:1)', () => {
    for (const t of [darkTheme, lightTheme]) {
      expect(contrastRatio(t.colors.primary, t.colors.onPrimary)).toBeGreaterThanOrEqual(3)
    }
  })

  it('pixelSizeAt is 1 dmm per metre of distance', () => {
    expect(pixelSizeAt(1)).toBe(0.001)
    expect(pixelSizeAt(2)).toBe(0.002)
  })
})
