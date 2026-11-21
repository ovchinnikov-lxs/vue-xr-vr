import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'

// Exactly what the Getting started guide tells users to write.
export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })],
})
