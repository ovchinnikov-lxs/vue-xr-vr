<script setup lang="ts">
import { XrBox, XrButton, XrPanel, XrTooltip } from 'vue-xr-ui'
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :padding="8">
    <XrBox direction="row" justify="center">
      <XrTooltip text="Hover me with a ray, a finger or the mouse">
        <XrButton variant="secondary">Hover</XrButton>
      </XrTooltip>
    </XrBox>
  </XrPanel>
</template>
