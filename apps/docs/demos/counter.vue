<script setup lang="ts">
import { ref } from 'vue'
import { XrBox, XrButton, XrPanel, XrText } from 'vue-xr-ui'

const count = ref(0)
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="4">
    <XrText variant="title">Count: {{ count }}</XrText>
    <XrBox direction="row" :gap="3">
      <XrButton @click="count++">Increment</XrButton>
      <XrButton variant="secondary" :disabled="count === 0" @click="count = 0">Reset</XrButton>
      <XrButton variant="ghost">Ghost</XrButton>
    </XrBox>
  </XrPanel>
</template>
