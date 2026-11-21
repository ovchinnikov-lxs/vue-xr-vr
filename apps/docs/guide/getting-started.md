# Getting started

## Install

```bash
pnpm add vue-xr-ui @tresjs/core three
```

`vue`, `three` and `@tresjs/core` are peer dependencies, so your app has one
copy of each.

## Set up the app

Install the plugin. It holds the XR session controller and the theme for the
whole app.

```ts
// main.ts
import { createApp } from 'vue'
import { createXrUi, darkTheme } from 'vue-xr-ui'
import App from './App.vue'

createApp(App).use(createXrUi({ theme: darkTheme })).mount('#app')
```

TresJS elements (`<TresMesh>`, `<TresPerspectiveCamera>`) need its template
compiler options in Vite:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })],
})
```

## Your first panel

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { XrButton, XrEnterButton, XrPanel, XrScene, XrText } from 'vue-xr-ui'

const count = ref(0)
</script>

<template>
  <TresCanvas window-size>
    <TresPerspectiveCamera :position="[0, 1.5, 0.1]" :look-at="[0, 1.4, -1]" />
    <XrScene>
      <XrPanel :position="[0, 1.45, -1]" :width="440">
        <XrText variant="headline">Hello, XR</XrText>
        <XrButton @click="count++">Clicked {{ count }} times</XrButton>
      </XrPanel>
    </XrScene>
  </TresCanvas>

  <XrEnterButton mode="vr" />
</template>
```

That is the whole app. It works with the mouse in the browser, and in the
headset with controllers, hand pinch and a fingertip poke:

<LiveDemo demo="counter" />

## Next steps

- [Core concepts](./concepts): units, layout, the `ui` escape hatch.
- [Input](./input): how one `click` covers every input.
- [Testing on a Quest](./quest): open your dev server in the headset.
