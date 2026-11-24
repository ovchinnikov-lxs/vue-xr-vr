<script setup lang="ts">
import { computed, ref } from 'vue'
import { XrAnchor, XrBox, XrButton, XrPanel, XrText } from 'vue-xr-ui'

// Nudge the card, pin it, reload the page: it stays where it was pinned.
const offset = ref(0)
const position = computed<[number, number, number]>(() => [offset.value, 1.45, -1])
</script>

<template>
  <XrAnchor id="docs-demo-card" :position="position" v-slot="{ place, forget, saved }">
    <XrPanel :width="380">
      <XrText variant="title">{{ saved ? 'Pinned' : 'Not pinned' }}</XrText>
      <XrText muted>Nudge it, pin it, then reload the page.</XrText>
      <XrBox direction="row" :gap="3">
        <XrButton variant="secondary" @click="offset += 0.05">Nudge</XrButton>
        <XrButton v-if="!saved" @click="place()">Pin here</XrButton>
        <XrButton v-else variant="ghost" @click="forget(); offset = 0">Unpin</XrButton>
      </XrBox>
    </XrPanel>
  </XrAnchor>
</template>
