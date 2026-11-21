<script setup lang="ts">
import { XrPanel, XrText } from 'vue-xr-ui'
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="4">
    <XrText variant="title">Today</XrText>
    <XrPanel variant="sunken" :padding="4">
      <XrText muted>Nested panels are cards.</XrText>
    </XrPanel>
    <XrPanel variant="raised" :padding="4">
      <XrText muted>A raised card.</XrText>
    </XrPanel>
  </XrPanel>
</template>
