<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { XrEnterButton, XrScene } from 'vue-xr-ui'
import HelloPanel from './scenes/HelloPanel.vue'
</script>

<template>
  <TresCanvas clear-color="#0d0f14" window-size>
    <TresPerspectiveCamera :position="[0, 1.5, 0.1]" :look-at="[0, 1.45, -1]" :fov="60" />
    <XrScene>
      <HelloPanel />
    </XrScene>
  </TresCanvas>

  <div class="overlay">
    <XrEnterButton mode="vr" />
    <XrEnterButton mode="ar" />
  </div>
</template>
