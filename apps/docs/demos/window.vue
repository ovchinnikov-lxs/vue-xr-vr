<script setup lang="ts">
import { ref } from 'vue'
import { XrText, XrWindow } from 'vue-xr-ui'

const position = ref<[number, number, number]>([0, 1.45, -1])
</script>

<template>
  <XrWindow v-model:position="position" :width="400">
    <XrText variant="title">Drag the bar below</XrText>
    <XrText muted>Position: {{ position.map((v) => v.toFixed(2)).join(', ') }}</XrText>
  </XrWindow>
</template>
