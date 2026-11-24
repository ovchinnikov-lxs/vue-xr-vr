<script setup lang="ts">
import { ref } from 'vue'
import { XrFollow, XrPanel, XrText, XrToggle } from 'vue-xr-ui'

const follow = ref(true)
const state = ref('Settled')
</script>

<template>
  <XrFollow :active="follow" :distance="1" :height="0" @follow="state = 'Following'" @settle="state = 'Settled'">
    <XrPanel :width="360">
      <XrText variant="title">Always in view</XrText>
      <XrText muted>In VR, turn around: this panel glides back in front of you.</XrText>
      <XrToggle v-model="follow">Follow me</XrToggle>
      <XrText variant="caption" muted>{{ follow ? state : 'Pinned' }}</XrText>
    </XrPanel>
  </XrFollow>
</template>
