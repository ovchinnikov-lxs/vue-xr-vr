<script setup lang="ts">
import { computed } from 'vue'
import { XrPanel, XrText, useXr } from 'vue-xr-ui'

const xr = useXr()
const status = computed(() => {
  if (!xr.isPresenting.value) return 'In the browser'
  return xr.mode.value === 'immersive-ar' ? 'Passthrough' : 'In VR'
})
</script>

<template>
  <XrPanel name="mr-intro" :position="[0, 1.45, -1]" :width="440">
    <XrText variant="headline">Mixed reality</XrText>
    <XrText muted>Enter AR on a Quest 3: the room shows through behind the UI.</XrText>
    <XrText variant="label">{{ status }}</XrText>
  </XrPanel>
</template>
