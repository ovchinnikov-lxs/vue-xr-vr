/**
 * Inter with Latin and Cyrillic, as uikit MSDF fonts. uikit's own default
 * font covers Latin only: Russian text would render as blanks.
 *
 * Each weight is its own chunk (about 250 KB), loaded the first time text
 * in that weight is shown. Rebuild with scripts/build-fonts.mjs.
 */
const load = (file: Promise<{ default: unknown }>) => file.then((m) => m.default)

export const interFontFamily = {
  normal: () => load(import('../fonts/inter-400.json')),
  medium: () => load(import('../fonts/inter-500.json')),
  'semi-bold': () => load(import('../fonts/inter-600.json')),
  bold: () => load(import('../fonts/inter-700.json')),
}

export const defaultFontFamilies = { inter: interFontFamily }
