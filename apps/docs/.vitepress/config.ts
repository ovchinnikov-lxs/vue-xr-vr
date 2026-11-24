import { defineConfig } from 'vitepress'
import { templateCompilerOptions } from '@tresjs/core'

const components = [
  ['Layout', ['XrScene', 'XrPanel', 'XrWindow', 'XrDialog', 'XrBox', 'XrText']],
  ['Controls', ['XrButton', 'XrIcon', 'XrToggle', 'XrCheckbox', 'XrRadioGroup', 'XrSlider', 'XrProgress', 'XrTabs', 'XrList', 'XrSelect', 'XrTooltip']],
  ['Text input', ['XrTextField', 'XrNumberInput', 'XrKeyboard']],
  ['Mixed reality', ['XrFollow', 'XrBillboard', 'XrPlanes', 'XrAnchor']],
  ['App', ['XrThemeProvider', 'XrEnterButton']],
] as const

export default defineConfig({
  title: 'vue-xr-ui',
  description: 'Vue components for VR and mixed-reality interfaces on the web.',
  cleanUrls: true,
  lastUpdated: true,
  // TresJS elements (<TresMesh>…) in live demos are custom elements to Vue.
  vue: { ...templateCompilerOptions },
  vite: { ssr: { noExternal: ['vue-xr-ui', '@vue-xr-ui/tokens'] } },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Components', link: '/components/' },
      { text: 'Playground', link: 'https://vue-xr-vr.vercel.app' },
      { text: 'Roadmap', link: 'https://github.com/ovchinnikov-lxs/vue-xr-vr/milestones' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'What is vue-xr-ui', link: '/guide/what-is' },
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Core concepts', link: '/guide/concepts' },
            { text: 'Input', link: '/guide/input' },
            { text: 'Theming', link: '/guide/theming' },
            { text: 'Text and voice input', link: '/guide/text-input' },
            { text: 'Mixed reality', link: '/guide/mixed-reality' },
            { text: 'Testing on a Quest', link: '/guide/quest' },
            { text: 'Testing in an emulator', link: '/guide/testing' },
          ],
        },
      ],
      '/components/': components.map(([text, names]) => ({
        text,
        items: names.map((name) => ({ text: `&lt;${name}&gt;`, link: `/components/${name}` })),
      })),
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ovchinnikov-lxs/vue-xr-vr' }],
    editLink: { pattern: 'https://github.com/ovchinnikov-lxs/vue-xr-vr/edit/main/apps/docs/:path' },
    search: { provider: 'local' },
    footer: { message: 'MIT License' },
  },
})
