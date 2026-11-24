<script setup lang="ts">
import { computed, ref } from 'vue'
import { XrPanel, XrSelect, XrText } from 'vue-xr-ui'

const quality = ref('High')
const voice = ref<string>()
const voices = [
  { label: 'Nova', value: 'nova', description: 'Warm and calm' },
  { label: 'Echo', value: 'echo', description: 'Bright, a little fast' },
  { label: 'Sage', value: 'sage', description: 'Low and slow' },
  { label: 'Ember', value: 'ember', description: 'Coming soon', disabled: true },
]
const summary = computed(() => `${quality.value} quality, ${voices.find((v) => v.value === voice.value)?.label ?? 'no voice'}`)
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="380" :gap="3">
    <XrText variant="title">Settings</XrText>
    <XrText variant="label">Graphics</XrText>
    <XrSelect v-model="quality" :options="['Low', 'Medium', 'High', 'Ultra']" />
    <XrText variant="label">Voice</XrText>
    <XrSelect v-model="voice" :options="voices" placeholder="Pick a voice" />
    <XrText variant="caption" muted>{{ summary }}</XrText>
  </XrPanel>
</template>
