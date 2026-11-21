import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { createXrUi, darkTheme } from 'vue-xr-ui'
import LiveDemo from './LiveDemo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(createXrUi({ theme: darkTheme }))
    app.component('LiveDemo', LiveDemo)
  },
} satisfies Theme
