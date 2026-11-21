<script setup lang="ts">
// Reports to the smoke test that the frame loop runs and the panel is in the
// scene, using only the public API (useXrFrame) and TresJS.
import { useTres } from '@tresjs/core'
import { useXrFrame } from 'vue-xr-ui'

declare global {
  interface Window {
    __smoke?: { frames: number; objects: number }
  }
}

const { scene } = useTres()
const state = { frames: 0, objects: 0 }
window.__smoke = state
useXrFrame(() => {
  state.frames++
  let n = 0
  scene.value.traverse(() => n++)
  state.objects = n
})
</script>

<template>
  <TresGroup />
</template>
