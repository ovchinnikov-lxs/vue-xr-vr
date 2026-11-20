import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { templateCompilerOptions } from '@tresjs/core'

// `pnpm dev` serves http://localhost (the WebXR emulator is injected there).
// `pnpm dev:https` adds a self-signed certificate so a Quest on the same
// Wi-Fi can open https://<your-ip>:5173 (WebXR requires https off localhost).
// BASE_PATH is set by the GitHub Pages deploy, which serves the site from
// /<repo>/ (see .github/workflows/pages.yml).
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue({ ...templateCompilerOptions }), ...(mode === 'https' ? [basicSsl()] : [])],
}))
