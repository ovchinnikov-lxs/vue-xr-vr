<script setup lang="ts">
import { computed, ref, shallowRef, watchEffect } from 'vue'
import type { Mesh } from 'three'
import {
  XrBox,
  XrButton,
  XrKeyboard,
  XrPanel,
  XrSlider,
  XrText,
  XrTextField,
  XrThemeProvider,
  XrList,
  XrListItem,
  XrTabs,
  XrToggle,
  XrTooltip,
  XrWindow,
  darkTheme,
  lightTheme,
  useXr,
  useXrFrame,
  useXrTheme,
  withAccent,
} from 'vue-xr-ui'

const xr = useXr()
const theme = useXrTheme()
const count = ref(0)
const sound = ref(true)
const volume = ref(40)
// v-model keeps where the window was put; save it to restore the layout next time.
const tab = ref('Controls')
const playing = ref<string>()
const tracks = Array.from({ length: 12 }, (_, i) => ({ title: `Track ${i + 1}`, artist: ['Aurora Lane', 'Night Ferry', 'Glasshouse'][i % 3]! }))
const windowPosition = ref<[number, number, number]>([0, 1.45, -1])

const status = computed(() => (xr.isPresenting.value ? `In session: ${xr.mode.value}` : 'In the browser'))

// The app-wide theme is built from two choices: light or dark, and one accent colour.
const mode = ref<'Dark' | 'Light'>('Dark')
const accents = ['#4f7cff', '#22c55e', '#f59e0b', '#f43f5e', '#a855f7']
const accent = ref(accents[0]!)
watchEffect(() => {
  theme.value = withAccent(mode.value === 'Dark' ? darkTheme : lightTheme, accent.value)
})
function toggleTheme() {
  mode.value = mode.value === 'Dark' ? 'Light' : 'Dark'
}
const onAccent = (color: string) => withAccent(darkTheme, color).colors.onPrimary

const message = ref('')
const sent = ref<string[]>([])
function send() {
  if (!message.value.trim()) return
  sent.value = [message.value, ...sent.value].slice(0, 3)
  message.value = ''
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

  <XrWindow v-model:position="windowPosition" name="window" :width="440">
    <XrText variant="headline">vue-xr-ui</XrText>
    <XrText muted>
      Point a controller ray, pinch, or poke the buttons with your finger. Same click event for every input. Drag the bar below to move the window.
    </XrText>

    <XrTabs v-model="tab" :tabs="['Controls', 'List', 'Type', 'Theme']" block />

    <!-- The active tab's content is the window's last child (see node.ts on v-if order). -->
    <XrBox v-if="tab === 'Controls'" :gap="4">
      <XrPanel variant="sunken" direction="row" align="center" justify="space-between" :padding="4">
        <XrText variant="title">Count: {{ count }}</XrText>
        <XrText variant="caption" muted>{{ status }}</XrText>
      </XrPanel>

      <XrBox direction="row" :gap="3">
        <XrButton @click="count++">Increment</XrButton>
        <XrButton variant="secondary" :disabled="count === 0" @click="count = 0">Reset</XrButton>
        <XrTooltip text="Switch light / dark">
          <XrButton variant="ghost" @click="toggleTheme">Mode</XrButton>
        </XrTooltip>
      </XrBox>

      <XrPanel variant="sunken" :padding="4" :gap="2">
        <XrToggle v-model="sound">Sound</XrToggle>
        <XrBox direction="row" align="center" :gap="4">
          <XrSlider v-model="volume" name="volume" :disabled="!sound" :ui="{ flexGrow: 1 }" />
          <XrText variant="label">{{ sound ? `Volume: ${volume}` : 'Muted' }}</XrText>
        </XrBox>
      </XrPanel>
    </XrBox>

    <XrBox v-else-if="tab === 'List'" :gap="3">
      <XrText variant="label">{{ playing ? `Playing: ${playing}` : 'Pick a track' }}</XrText>
      <XrList name="tracks" :max-height="220">
        <XrListItem
          v-for="track in tracks"
          :key="track.title"
          :label="track.title"
          :description="track.artist"
          :selected="playing === track.title"
          @click="playing = track.title"
        />
      </XrList>
    </XrBox>

    <XrBox v-else-if="tab === 'Type'" :gap="3">
      <XrText variant="label">Message</XrText>
      <XrTextField v-model="message" name="message" placeholder="Привет! Type here…" @submit="send" />
      <XrText variant="caption" muted>Tap the field, then type on the keyboard below. Enter sends.</XrText>
      <XrPanel variant="sunken" :padding="4" :gap="2">
        <XrText v-if="sent.length === 0" muted>Nothing sent yet</XrText>
        <XrText v-for="(text, i) in sent" :key="i + text" name="sent">{{ text }}</XrText>
      </XrPanel>
    </XrBox>

    <XrBox v-else :gap="4">
      <XrBox direction="row" align="center" justify="space-between">
        <XrText variant="label">Mode</XrText>
        <XrTabs v-model="mode" :tabs="['Dark', 'Light']" />
      </XrBox>
      <XrBox direction="row" align="center" justify="space-between">
        <XrText variant="label">Accent</XrText>
        <XrBox direction="row" :gap="2">
          <XrButton
            v-for="color in accents"
            :key="color"
            :name="`accent-${color}`"
            size="sm"
            :label="accent === color ? '✓' : ''"
            :ui="{ width: 48, paddingX: 0, backgroundColor: color, color: onAccent(color), hover: { backgroundColor: color }, active: { backgroundColor: color } }"
            @click="accent = color"
          />
        </XrBox>
      </XrBox>
      <!-- A theme for one part of the scene: this card keeps its own accent. -->
      <XrThemeProvider accent="#f43f5e">
        <XrPanel variant="sunken" :padding="4" :gap="3">
          <XrText variant="title">Danger zone</XrText>
          <XrText muted>This card has its own accent from one colour, the rest follows the app theme.</XrText>
          <XrBox direction="row" :gap="3">
            <XrButton>Delete</XrButton>
            <XrButton variant="secondary">Cancel</XrButton>
          </XrBox>
        </XrPanel>
      </XrThemeProvider>
    </XrBox>
  </XrWindow>

  <!-- A second window: the keyboard, below the main one while typing. -->
  <XrWindow v-if="tab === 'Type'" name="keyboard-window" :position="[0, 1.06, -0.8]">
    <XrKeyboard name="keyboard" />
  </XrWindow>
</template>
