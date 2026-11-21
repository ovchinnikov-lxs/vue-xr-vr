// Consumer smoke test: what a user gets from npm, in a fresh app.
// 1. `pnpm pack` vue-xr-ui and @vue-xr-ui/tokens (exactly the published files).
// 2. Copy scripts/smoke-app to a temp dir, install the tarballs with npm
//    (no workspace, no hoisting tricks), type-check with vue-tsc, vite build.
// 3. Serve the build and open it in Chromium: no errors, the frame loop runs,
//    the panel and its font load.
// Run after `pnpm build`. Env PW_CHROMIUM_PATH: a Chromium to use.
import { execFileSync, spawn } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const work = mkdtempSync(join(tmpdir(), 'vue-xr-ui-smoke-'))
const run = (cmd, args, cwd) => {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { cwd, stdio: 'inherit' })
}

// 1. Pack
const packs = join(work, 'packs')
for (const pkg of ['packages/tokens', 'packages/vue-xr-ui']) run('pnpm', ['pack', '--pack-destination', packs], join(root, pkg))
const tarball = (prefix) => join(packs, readdirSync(packs).find((f) => f.startsWith(prefix)))

// 2. App
const app = join(work, 'app')
cpSync(join(root, 'scripts/smoke-app'), app, { recursive: true })
const lib = JSON.parse(readFileSync(join(root, 'packages/vue-xr-ui/package.json'), 'utf8'))
const playground = JSON.parse(readFileSync(join(root, 'apps/playground/package.json'), 'utf8'))
const dev = playground.devDependencies
writeFileSync(
  join(app, 'package.json'),
  JSON.stringify(
    {
      name: 'smoke-app',
      private: true,
      type: 'module',
      dependencies: {
        'vue-xr-ui': `file:${tarball('vue-xr-ui-')}`,
        '@vue-xr-ui/tokens': `file:${tarball('vue-xr-ui-tokens-')}`,
        vue: lib.devDependencies.vue,
        three: lib.devDependencies.three,
        '@tresjs/core': lib.devDependencies['@tresjs/core'],
      },
      devDependencies: {
        vite: dev.vite,
        '@vitejs/plugin-vue': dev['@vitejs/plugin-vue'],
        'vue-tsc': '^3.1.0',
        typescript: '~5.9.3',
        '@types/three': dev['@types/three'],
        '@types/webxr': dev['@types/webxr'],
      },
    },
    null,
    2,
  ),
)
run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], app)
run('npx', ['vue-tsc', '-p', 'tsconfig.json'], app)
run('npx', ['vite', 'build'], app)

// 3. Browser
const port = 4317
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: app, stdio: 'ignore' })
const requireFromPlayground = createRequire(join(root, 'apps/playground/package.json'))
const { chromium } = requireFromPlayground('@playwright/test')
let failed = false
try {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // Chromium asks for /favicon.ico on its own; that 404 says nothing about the library.
  page.on('console', (m) => m.type() === 'error' && !m.location().url.endsWith('/favicon.ico') && errors.push(`${m.text()} (${m.location().url})`))
  page.on('requestfailed', (r) => errors.push(`failed ${r.url()}`))
  const font = page.waitForResponse((r) => /inter-\d00/.test(r.url()) && r.ok(), { timeout: 30_000 })
  for (let i = 0; ; i++) {
    try {
      await page.goto(`http://localhost:${port}/`)
      break
    } catch (e) {
      if (i > 40) throw e
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  await font
  await page.waitForFunction(() => (window.__smoke?.frames ?? 0) > 30 && (window.__smoke?.objects ?? 0) > 5, null, { timeout: 30_000 })
  const button = await page.locator('.xr-enter-button').textContent()
  const smoke = await page.evaluate(() => window.__smoke)
  console.log(`frames ${smoke.frames}, scene objects ${smoke.objects}, enter button "${button}"`)
  if (errors.length) {
    failed = true
    console.error('Page errors:\n' + errors.join('\n'))
  }
  await browser.close()
} catch (e) {
  failed = true
  console.error(e)
} finally {
  server.kill()
}
console.log(failed ? 'Smoke test FAILED' : 'Smoke test passed')
process.exit(failed ? 1 : 0)
