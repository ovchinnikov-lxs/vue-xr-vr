<script setup lang="ts">
import { computed, ref } from 'vue'
import { XrBillboard, XrFollow, XrPanel, XrText, XrToggle, useXr } from 'vue-xr-ui'

const xr = useXr()
const status = computed(() => {
  if (!xr.isPresenting.value) return 'In the browser'
  return xr.mode.value === 'immersive-ar' ? 'Passthrough' : 'In VR'
})

// The HUD follows lazily; switch it off to leave it where it is.
const follow = ref(true)
const hudState = ref('Settled')
</script>

<template>
  <XrPanel name="mr-intro" :position="[0, 1.45, -1]" :width="440">
    <XrText variant="headline">Mixed reality</XrText>
    <XrText muted>Enter AR on a Quest 3: the room shows through behind the UI.</XrText>
    <XrText variant="label">{{ status }}</XrText>
  </XrPanel>

  <XrBillboard :position="[0.75, 1.35, -1.1]" axis="all">
    <XrPanel name="tag" :width="180" :padding="3">
      <XrText variant="label">Faces you</XrText>
    </XrPanel>
  </XrBillboard>

  <XrFollow :active="follow" :distance="0.9" :height="-0.35" @follow="hudState = 'Following'" @settle="hudState = 'Settled'">
    <XrPanel name="hud" :width="300" :padding="3" :gap="2">
      <XrToggle v-model="follow">Follow me</XrToggle>
      <XrText variant="caption" muted>{{ follow ? hudState : 'Pinned' }}</XrText>
    </XrPanel>
  </XrFollow>
</template>
