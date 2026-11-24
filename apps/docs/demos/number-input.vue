<script setup lang="ts">
import { ref } from 'vue'
import { XrBox, XrNumberInput, XrPanel, XrText } from 'vue-xr-ui'

const guests = ref(2)
const temperature = ref(21.5)
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="4">
    <XrBox direction="row" align="center" justify="space-between" :gap="4">
      <XrText variant="label">Guests</XrText>
      <XrNumberInput v-model="guests" :min="1" :max="12" :ui="{ width: 220 }" />
    </XrBox>
    <XrBox direction="row" align="center" justify="space-between" :gap="4">
      <XrText variant="label">Temperature</XrText>
      <XrNumberInput v-model="temperature" :min="16" :max="28" :step="0.5" suffix="°C" :ui="{ width: 220 }" />
    </XrBox>
  </XrPanel>
</template>
