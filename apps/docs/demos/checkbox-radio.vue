<script setup lang="ts">
import { computed, ref } from 'vue'
import { XrCheckbox, XrPanel, XrRadioGroup, XrText } from 'vue-xr-ui'

const rooms = ref({ Kitchen: true, Bedroom: false })
const all = computed(() => Object.values(rooms.value).every(Boolean))
const some = computed(() => Object.values(rooms.value).some(Boolean) && !all.value)
const setAll = (on: boolean) => Object.keys(rooms.value).forEach((k) => (rooms.value[k as keyof typeof rooms.value] = on))
const quality = ref('High')
</script>

<template>
  <XrPanel :position="[0, 1.45, -1]" :width="420" :gap="2">
    <XrText variant="title">Lights</XrText>
    <XrCheckbox :model-value="all" :indeterminate="some" @update:model-value="setAll">All rooms</XrCheckbox>
    <XrCheckbox v-for="(_, room) in rooms" :key="room" v-model="rooms[room]" :label="room" :ui="{ marginLeft: 32 }" />
    <XrText variant="title">Quality</XrText>
    <XrRadioGroup v-model="quality" direction="row" :options="['Low', 'Medium', 'High']" />
  </XrPanel>
</template>
