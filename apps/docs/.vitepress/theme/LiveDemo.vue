<script setup lang="ts">
// A live 3D scene inside a docs page. Works with the mouse on a desktop and
// enters VR from the Quest browser. Lazily loaded so the page itself (and
// server-side rendering) never touches WebGL.
import { defineAsyncComponent } from 'vue'

defineProps<{ demo: string; height?: number }>()
const DemoCanvas = defineAsyncComponent(() => import('./DemoCanvas.vue'))
</script>

<template>
  <ClientOnly>
    <DemoCanvas :demo="demo" :height="height ?? 360" />
  </ClientOnly>
</template>
