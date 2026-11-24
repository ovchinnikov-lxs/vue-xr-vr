<script setup lang="ts">
import { ref } from 'vue'
import { Bell, BellOff, Heart, Settings, Share2 } from 'lucide'
import { XrBox, XrButton, XrIcon, XrPanel, XrText } from 'vue-xr-ui'

const liked = ref(false)
const alerts = ref(true)
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="4">
    <XrBox direction="row" align="center" :gap="2">
      <XrIcon :icon="Settings" muted />
      <XrText variant="title">Icons</XrText>
    </XrBox>
    <XrBox direction="row" align="center" :gap="2">
      <XrButton variant="ghost" :icon="Heart" :ui="liked ? { color: '#f43f5e' } : {}" @click="liked = !liked" />
      <XrButton variant="ghost" :icon="alerts ? Bell : BellOff" @click="alerts = !alerts" />
      <XrButton variant="secondary" :icon="Share2" label="Share" />
    </XrBox>
  </XrPanel>
</template>
