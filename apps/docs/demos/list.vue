<script setup lang="ts">
import { ref } from 'vue'
import { XrList, XrListItem, XrPanel, XrText } from 'vue-xr-ui'

const tracks = Array.from({ length: 12 }, (_, i) => ({ title: `Track ${i + 1}`, artist: ['Aurora Lane', 'Night Ferry', 'Glasshouse'][i % 3]! }))
const playing = ref<string>()
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="3">
    <XrText variant="label">{{ playing ? `Playing: ${playing}` : 'Pick a track' }}</XrText>
    <XrList :max-height="200">
      <XrListItem
        v-for="track in tracks"
        :key="track.title"
        :label="track.title"
        :description="track.artist"
        :selected="playing === track.title"
        @click="playing = track.title"
      />
    </XrList>
  </XrPanel>
</template>
