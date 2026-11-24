<script setup lang="ts">
import { XrBillboard, XrPanel, XrText } from 'vue-xr-ui'

const tags = [
  { label: 'Lamp', position: [-0.35, 1.5, -1.2] as [number, number, number] },
  { label: 'Speaker', position: [0, 1.38, -1.4] as [number, number, number] },
  { label: 'Window', position: [0.35, 1.52, -1.1] as [number, number, number] },
]
</script>

<template>
  <XrBillboard v-for="tag in tags" :key="tag.label" :position="tag.position">
    <XrPanel :width="150" :padding="3">
      <XrText variant="label">{{ tag.label }}</XrText>
    </XrPanel>
  </XrBillboard>
</template>
