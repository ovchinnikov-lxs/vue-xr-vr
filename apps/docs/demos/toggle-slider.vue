<script setup lang="ts">
import { ref } from 'vue'
import { XrBox, XrPanel, XrSlider, XrText, XrToggle } from 'vue-xr-ui'

const sound = ref(true)
const volume = ref(40)
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="3">
    <XrToggle v-model="sound">Sound</XrToggle>
    <XrBox direction="row" align="center" :gap="4">
      <XrSlider v-model="volume" :disabled="!sound" :ui="{ flexGrow: 1 }" />
      <XrText variant="label">{{ sound ? `Volume: ${volume}` : 'Muted' }}</XrText>
    </XrBox>
  </XrPanel>
</template>
