<script setup lang="ts">
import { ref } from 'vue'
import { XrBox, XrButton, XrPanel, XrProgress } from 'vue-xr-ui'

const done = ref(40)
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="4">
    <XrProgress :value="done" label="Downloading" show-value />
    <XrBox direction="row" align="center" :gap="3">
      <XrButton variant="secondary" size="sm" label="+10%" @click="done = Math.min(100, done + 10)" />
      <XrButton variant="ghost" size="sm" label="Reset" @click="done = 0" />
    </XrBox>
    <XrProgress indeterminate label="Connecting" />
    <XrProgress variant="spinner" label="Loading rooms…" />
  </XrPanel>
</template>
