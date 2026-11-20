<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { XrEnterButton, XrScene } from 'vue-xr-ui'
import { defineAsyncComponent } from 'vue'
import HelloPanel from './scenes/HelloPanel.vue'

// Bridge for the Playwright tests in e2e/, never shipped in production builds.
const TestHook = import.meta.env.DEV ? defineAsyncComponent(() => import('./e2e/TestHook')) : null
// Tests open `/?e2e`: the emulator runs headless and is driven from code.
const emulator = new URLSearchParams(location.search).has('e2e') ? { devUI: false, room: false as const } : true
</script>

<template>
  <TresCanvas clear-color="#0d0f14" window-size>
    <TresPerspectiveCamera :position="[0, 1.5, 0.1]" :look-at="[0, 1.3, -1]" :fov="60" />
    <XrScene :emulator="emulator">
      <HelloPanel />
      <component :is="TestHook" v-if="TestHook" />
    </XrScene>
  </TresCanvas>

  <div class="overlay">
    <XrEnterButton mode="vr" />
    <XrEnterButton mode="ar" />
  </div>
</template>
