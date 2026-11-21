import { fileURLToPath } from 'node:url'
import type { CoverageReportOptions } from 'monocart-coverage-reports'

// E2E coverage of the library source: with E2E_COVERAGE=1 every test records
// Chromium's V8 JS coverage, and the global teardown maps it through Vite's
// source maps back to packages/vue-xr-ui/src and writes lcov for Codecov.
export const coverageEnabled = !!process.env.E2E_COVERAGE

const repo = fileURLToPath(new URL('../../../', import.meta.url))
const librarySrc = 'packages/vue-xr-ui/src/'

export const coverageOptions: CoverageReportOptions = {
  name: 'vue-xr-ui e2e coverage',
  outputDir: `${repo}coverage-e2e`,
  reports: ['lcovonly', 'text-summary'],
  // Vite serves workspace files as /@fs/<abs path>: keep the library's
  // modules, not the font JSON it imports.
  entryFilter: (entry) => entry.url.includes(`/${librarySrc}`) && !entry.url.includes('?import'),
  // Vite's source maps name only the file (XrButton.ts); take the directory
  // from the served URL so lcov has repo-relative paths like the unit run.
  sourcePath: (path, info) => {
    const dist = String(info.distFile ?? '')
    const i = dist.indexOf(librarySrc)
    return i >= 0 ? dist.slice(i, dist.lastIndexOf('/') + 1) + path.split('/').pop() : path
  },
}
