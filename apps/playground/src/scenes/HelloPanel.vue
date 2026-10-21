<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import type { Mesh } from 'three'
import { XrBox, XrButton, XrPanel, XrText, darkTheme, lightTheme, useXr, useXrFrame, useXrTheme } from 'vue-xr-ui'

const xr = useXr()
const theme = useXrTheme()
const count = ref(0)

const status = computed(() => (xr.isPresenting.value ? `In session: ${xr.mode.value}` : 'In the browser'))

function toggleTheme() {
  theme.value = theme.value.name === 'dark' ? lightTheme : darkTheme
}

// useXrFrame keeps running inside the headset, unlike TresJS useLoop.
const cube = shallowRef<Mesh>()
useXrFrame((delta) => {
  if (cube.value) cube.value.rotation.y += delta * 0.001
})
</script>

<template>
  <TresAmbientLight :intensity="0.6" />
  <TresDirectionalLight :position="[2, 4, 2]" :intensity="1.5" />
  <TresGridHelper :args="[10, 20, '#2a2d36', '#1b1d24']" />

  <TresMesh ref="cube" :position="[0.55, 1.45, -1.1]">
    <TresBoxGeometry :args="[0.15, 0.15, 0.15]" />
    <TresMeshStandardMaterial color="#4f7cff" />
  </TresMesh>

  <XrPanel :position="[0, 1.45, -1]" :width="440">
    <XrText variant="headline">vue-xr-ui</XrText>
    <XrText muted>
      Point a controller ray, pinch, or poke the buttons with your finger. Same click event for every input.
    </XrText>

    <XrPanel variant="sunken" direction="row" align="center" justify="space-between" :padding="4">
      <XrText variant="title">Count: {{ count }}</XrText>
      <XrText variant="caption" muted>{{ status }}</XrText>
    </XrPanel>

    <XrBox direction="row" :gap="3">
      <XrButton @click="count++">Increment</XrButton>
      <XrButton variant="secondary" :disabled="count === 0" @click="count = 0">Reset</XrButton>
      <XrButton variant="ghost" @click="toggleTheme">Theme</XrButton>
    </XrBox>
  </XrPanel>
</template>
