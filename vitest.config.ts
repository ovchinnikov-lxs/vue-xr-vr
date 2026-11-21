import { defineConfig } from 'vitest/config'

// Unit tests for the packages (node environment, no WebGL). The emulated
// Quest 3 end-to-end tests live in apps/playground/e2e (Playwright).
export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
    },
  },
})
