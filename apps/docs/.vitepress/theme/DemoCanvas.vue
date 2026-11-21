<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { XrEnterButton, XrScene } from 'vue-xr-ui'
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps<{ demo: string; height: number }>()
const demos = import.meta.glob('../../demos/*.vue')
const Demo = computed(() => {
  const load = demos[`../../demos/${props.demo}.vue`]
  if (!load) throw new Error(`[docs] No demo named ${props.demo} in apps/docs/demos/`)
  return defineAsyncComponent(load as () => Promise<{ default: object }>)
})
</script>

<template>
  <div class="live-demo" :style="{ height: `${height}px` }">
    <TresCanvas clear-color="#0d0f14">
      <TresPerspectiveCamera :position="[0, 1.45, 0]" :look-at="[0, 1.45, -1]" :fov="28" />
      <XrScene :emulator="false">
        <TresAmbientLight :intensity="0.8" />
        <component :is="Demo" />
      </XrScene>
    </TresCanvas>
    <div class="live-demo__enter">
      <XrEnterButton mode="vr" />
    </div>
  </div>
</template>
