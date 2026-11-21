<script setup lang="ts">
import { ref } from 'vue'
import { XrButton, XrDialog, XrPanel, XrText } from 'vue-xr-ui'

const open = ref(false)
const result = ref('Nothing deleted yet')
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="380" align="center">
    <XrText variant="title">Playlist</XrText>
    <XrText muted>{{ result }}</XrText>
    <XrButton @click="open = true">Delete playlist…</XrButton>
  </XrPanel>

  <XrDialog v-model:open="open" title="Delete playlist?" @close="result = 'Kept'">
    <XrText muted>All 12 tracks are removed. This cannot be undone.</XrText>
    <template #actions>
      <XrButton variant="secondary" @click="(result = 'Kept'), (open = false)">Cancel</XrButton>
      <XrButton @click="(result = 'Deleted'), (open = false)">Delete</XrButton>
    </template>
  </XrDialog>
</template>
