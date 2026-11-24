<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { XrEnterButton, XrScene, type EmulatedRoom, type EmulatorOptions } from 'vue-xr-ui'
import { defineAsyncComponent } from 'vue'
import HelloPanel from './scenes/HelloPanel.vue'

// Bridge for the Playwright tests in e2e/, never shipped in production builds.
const TestHook = import.meta.env.DEV ? defineAsyncComponent(() => import('./e2e/TestHook')) : null
const params = new URLSearchParams(location.search)
// `?scene=mr`: the mixed reality scene (passthrough, follow, planes, anchors, hand menu).
const mr = params.get('scene') === 'mr'
const MixedReality = defineAsyncComponent(() => import('./scenes/MixedReality.vue'))
// Tests open `/?e2e`: the emulator runs headless and is driven from code.
// `&room=<id>` loads a synthetic room for MR tests (planes, passthrough).
const room: EmulatedRoom | false = (params.get('room') as EmulatedRoom | null) ?? false
const emulator: EmulatorOptions | boolean = params.has('e2e') ? { devUI: false, room } : mr ? { room: 'kitchen' as const } : true
</script>

<template>
  <TresCanvas clear-color="#0d0f14" window-size>
    <TresPerspectiveCamera :position="[0, 1.5, 0.1]" :look-at="[0, 1.3, -1]" :fov="60" />
    <XrScene :emulator="emulator">
      <MixedReality v-if="mr" />
      <HelloPanel v-else />
      <component :is="TestHook" v-if="TestHook" />
    </XrScene>
  </TresCanvas>

  <div class="overlay">
    <template v-if="mr">
      <XrEnterButton mode="auto" />
      <a class="docs-link" href="?">Components</a>
    </template>
    <template v-else>
      <XrEnterButton mode="vr" />
      <XrEnterButton mode="ar" />
      <a class="docs-link" href="?scene=mr">Mixed reality</a>
    </template>
    <a class="docs-link" href="https://vue-xr-ui.vercel.app" target="_blank" rel="noopener">Docs</a>
  </div>
</template>
