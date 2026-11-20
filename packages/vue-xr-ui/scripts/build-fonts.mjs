/**
 * Builds the MSDF fonts in src/fonts: Inter with Latin and Cyrillic.
 *
 * The fonts bundled with uikit (@pmndrs/msdfonts) cover Latin only, so
 * Russian text (and the RU keyboard) would render as blanks.
 *
 * Run from an empty folder that has the tools installed:
 *   npm i msdf-bmfont-xml sharp @expo-google-fonts/inter
 *   node /path/to/packages/vue-xr-ui/scripts/build-fonts.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(join(process.cwd(), 'package.json'))
const sharp = require('sharp')
const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/fonts')
const work = join(process.cwd(), 'msdf-out')
mkdirSync(work, { recursive: true })

const latin = ' °!\\"#$%&\'()*+,-./0123456789:;<=>?@ÄÖÜABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`äöüabcdefghijklmnopqrstuvwxyz{|}~ß§'
let cyrillic = 'Ёё'
for (let c = 0x410; c <= 0x44f; c++) cyrillic += String.fromCodePoint(c)
const symbols = '–—«»…•№€₽←→↑↓⇧⇪⌫↵⏎✓×'
const charsetFile = join(work, 'charset.txt')
writeFileSync(charsetFile, latin + cyrillic + symbols)

const weights = { 400: '400Regular', 500: '500Medium', 600: '600SemiBold', 700: '700Bold' }
for (const [weight, name] of Object.entries(weights)) {
  const ttf = require.resolve(`@expo-google-fonts/inter/${name}/Inter_${name}.ttf`)
  execFileSync('npx', ['msdf-bmfont', '-f', 'json', '-o', join(work, `inter-${weight}`), '-s', '44', '-r', '4', '-m', '512,512', '-t', 'msdf', '-i', charsetFile, '--pot', ttf], { stdio: 'inherit' })
  const font = JSON.parse(readFileSync(join(work, `Inter_${name}.json`), 'utf8'))
  const webp = await sharp(join(work, font.pages[0])).webp({ lossless: true }).toBuffer()
  const { charset: _charset, ...info } = font.info
  const out = { ...font, info, pages: [`data:image/webp;base64,${webp.toString('base64')}`] }
  writeFileSync(join(outDir, `inter-${weight}.json`), JSON.stringify(out))
}
