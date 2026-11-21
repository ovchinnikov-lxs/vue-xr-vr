import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// Library build: ES modules in dist/, every dependency stays external so the
// app's bundler dedupes vue, three and TresJS. Font JSON files become lazy
// chunks (one per weight), as in dev.
const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Readable output: apps minify on their own, and stack traces stay useful.
    minify: false,
    rollupOptions: {
      external: (id) => external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
})
