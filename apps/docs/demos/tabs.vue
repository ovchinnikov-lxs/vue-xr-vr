<script setup lang="ts">
import { ref } from 'vue'
import { XrPanel, XrTabs, XrText } from 'vue-xr-ui'

const tab = ref('Controls')
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="4">
    <XrTabs v-model="tab" :tabs="['Controls', 'List', 'Theme']" block />
    <XrText muted>Selected: {{ tab }}</XrText>
  </XrPanel>
</template>
