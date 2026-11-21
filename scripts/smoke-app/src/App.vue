<script setup lang="ts">
import { ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { XrButton, XrEnterButton, XrPanel, XrScene, XrText } from 'vue-xr-ui'
import Probe from './Probe.vue'

const count = ref(0)
</script>

<template>
  <TresCanvas window-size>
    <TresPerspectiveCamera :position="[0, 1.5, 0.1]" :look-at="[0, 1.4, -1]" />
    <XrScene :emulator="false">
      <XrPanel :position="[0, 1.45, -1]" :width="440">
        <XrText variant="headline">Hello, XR</XrText>
        <XrButton @click="count++">Clicked {{ count }} times</XrButton>
      </XrPanel>
      <Probe />
    </XrScene>
  </TresCanvas>
  <XrEnterButton mode="vr" />
</template>
