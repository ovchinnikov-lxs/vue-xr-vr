<script setup lang="ts">
import { computed, ref, shallowRef, watchEffect } from 'vue'
import type { Mesh } from 'three'
import { Bell, BellOff, Heart, RotateCcw, Share2, Trash2 } from 'lucide'
import {
  XrBox,
  XrButton,
  XrCheckbox,
  XrDialog,
  XrIcon,
  XrKeyboard,
  XrNumberInput,
  XrPanel,
  XrProgress,
  XrRadioGroup,
  XrSelect,
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
const confirmOpen = ref(false)
const danger = ref('Nothing deleted')
const sound = ref(true)
const volume = ref(40)
const tab = ref('Controls')
const artists = ['Aurora Lane', 'Night Ferry', 'Glasshouse']
const tracks = Array.from({ length: 12 }, (_, i) => ({ title: `Track ${i + 1}`, artist: artists[i % 3]! }))
const playing = ref<string>()
// XrSelect: options as strings or { label, value, description }.
const artist = ref('')
const artistOptions = [
  { label: 'All artists', value: '', description: `${tracks.length} tracks` },
  ...artists.map((name) => ({ label: name, value: name, description: `${tracks.filter((t) => t.artist === name).length} tracks` })),
]
const shownTracks = computed(() => (artist.value ? tracks.filter((t) => t.artist === artist.value) : tracks))
// v-model keeps where the window was put; save it to restore the layout next time.
const windowPosition = ref<[number, number, number]>([0, 1.45, -1])

// Form tab. Icons are Lucide icon nodes, imported one by one from 'lucide'.
const liked = ref(false)
const shares = ref(0)
const alerts = ref(true)
// A parent checkbox shows a dash while only some rooms are on.
const rooms = ref<Record<string, boolean>>({ Kitchen: true, Bedroom: false })
const allRooms = computed(() => Object.values(rooms.value).every(Boolean))
const someRooms = computed(() => !allRooms.value && Object.values(rooms.value).some(Boolean))
const setAllRooms = (on: boolean) => Object.keys(rooms.value).forEach((room) => (rooms.value[room] = on))
const quality = ref('High')
const synced = ref(0)
const guests = ref(2)
// Selects inside a scrolling list: their options open past its clipped edge.
const roomScenes = ref<Record<string, string>>({ Hall: 'Off', Kitchen: 'Dim', Bedroom: 'Off', Office: 'Bright' })

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

const typeHint = computed(() =>
  xr.systemKeyboard.value
    ? 'Tap the field: the headset keyboard opens. Enter sends.'
    : 'Tap the field, then type on the keyboard below. Enter sends.',
)

// The keyboard's languages are a prop; v-model:layout is the active one.
const languages = ['en', 'ru', 'uk', 'de', 'fr', 'es'] as const
const language = ref(0)
const languageTab = computed({
  get: () => languages[language.value]!.toUpperCase(),
  set: (label: string) => (language.value = languages.findIndex((l) => l.toUpperCase() === label)),
})

const message = ref('')
// Two dialogs stacked: "Clear history?" (with a field of its own) asks again in front of itself.
const clearOpen = ref(false)
const sureOpen = ref(false)
const clearNote = ref('')
function clearHistory() {
  sent.value = []
  sureOpen.value = false
  clearOpen.value = false
}
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

  <XrWindow v-model:position="windowPosition" name="window" :width="480">
    <XrText variant="headline">vue-xr-ui</XrText>
    <XrText muted>
      Point a controller ray, pinch, or poke the buttons with your finger. Same click event for every input. Drag the bar below to move the window.
    </XrText>

    <XrTabs v-model="tab" :tabs="['Controls', 'List', 'Form', 'Type', 'Theme']" block />

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
      <!-- Its list opens over the tracks below. -->
      <XrSelect v-model="artist" name="artist" :options="artistOptions" :max-height="280" />
      <!-- Keyed by the filter: a fresh list keeps its items in order (see node.ts on v-for). -->
      <XrList :key="artist" name="tracks" :max-height="220">
        <XrListItem
          v-for="track in shownTracks"
          :key="track.title"
          :label="track.title"
          :description="track.artist"
          :selected="playing === track.title"
          @click="playing = track.title"
        />
      </XrList>
    </XrBox>

    <XrBox v-else-if="tab === 'Form'" :gap="4">
      <XrPanel variant="sunken" direction="row" align="center" :padding="3" :gap="2">
        <XrButton name="like" variant="ghost" :icon="Heart" :ui="liked ? { color: '#f43f5e' } : {}" @click="liked = !liked" />
        <XrButton name="alerts" variant="ghost" :icon="alerts ? Bell : BellOff" @click="alerts = !alerts" />
        <XrButton name="share" variant="secondary" size="sm" :icon="Share2" label="Share" @click="shares++" />
        <XrBox direction="column" align="flex-end" :grow="1">
          <XrBox direction="row" align="center" :gap="1">
            <XrIcon :icon="Heart" :size="16" muted />
            <XrText variant="caption" muted>{{ liked ? 'Liked' : 'Not liked' }}</XrText>
          </XrBox>
          <XrText variant="caption" muted>{{ alerts ? 'Alerts on' : 'Alerts off' }}</XrText>
          <XrText variant="caption" muted>Shares: {{ shares }}</XrText>
        </XrBox>
      </XrPanel>

      <XrBox direction="row" :gap="4">
        <XrBox :grow="1">
          <XrCheckbox name="all-rooms" :model-value="allRooms" :indeterminate="someRooms" @update:model-value="setAllRooms">All rooms</XrCheckbox>
          <XrCheckbox v-for="(_, room) in rooms" :key="room" v-model="rooms[room]" :name="`room-${room}`" :label="room" :ui="{ marginLeft: 24 }" />
        </XrBox>
        <XrBox :grow="1">
          <XrText variant="caption" muted>Quality: {{ quality }}</XrText>
          <XrRadioGroup v-model="quality" name="quality" :options="['Low', 'Medium', 'High']" />
        </XrBox>
      </XrBox>

      <XrBox direction="row" align="center" :gap="4">
        <XrText variant="label">Guests: {{ guests }}</XrText>
        <XrNumberInput v-model="guests" name="guests" :min="1" :max="8" :ui="{ flexGrow: 1 }" />
      </XrBox>

      <XrList name="room-scenes" :max-height="124" :gap="2">
        <XrBox v-for="(_, room) in roomScenes" :key="room" direction="row" align="center" :gap="3" :ui="{ flexShrink: 0 }">
          <XrText variant="label" :ui="{ width: 150 }">{{ room }}: {{ roomScenes[room] }}</XrText>
          <XrSelect v-model="roomScenes[room]" :name="`scene-${room}`" :options="['Off', 'Dim', 'Bright']" :ui="{ flexGrow: 1 }" />
        </XrBox>
      </XrList>

      <XrPanel variant="sunken" :padding="4" :gap="3">
        <XrProgress name="sync" :value="synced" label="Sync" show-value />
        <XrBox direction="row" align="center" :gap="3">
          <XrButton name="sync-step" variant="secondary" size="sm" label="+25%" :disabled="synced >= 100" @click="synced += 25" />
          <XrButton name="sync-reset" variant="ghost" size="sm" :icon="RotateCcw" @click="synced = 0" />
          <XrBox :grow="1" align="flex-end">
            <XrProgress name="spinner" variant="spinner" :size="24" :label="synced >= 100 ? 'Up to date' : 'Waiting…'" />
          </XrBox>
        </XrBox>
        <XrProgress name="loading" indeterminate />
      </XrPanel>
    </XrBox>

    <XrBox v-else-if="tab === 'Type'" :gap="3">
      <XrBox direction="row" align="center" justify="space-between">
        <XrText variant="label">Message</XrText>
        <XrTooltip text="Clear history">
          <XrButton name="clear" variant="ghost" size="sm" :icon="Trash2" @click="clearOpen = true" />
        </XrTooltip>
      </XrBox>
      <XrTextField v-model="message" name="message" placeholder="Привет! Type here…" @submit="send" />
      <XrText variant="caption" muted>{{ typeHint }}</XrText>
      <XrTabs v-if="!xr.systemKeyboard.value" v-model="languageTab" name="languages" :tabs="languages.map((l) => l.toUpperCase())" block />
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
          <XrBox direction="row" align="center" :gap="3">
            <XrButton @click="confirmOpen = true">Delete…</XrButton>
            <XrText variant="caption" muted>{{ danger }}</XrText>
          </XrBox>
        </XrPanel>
      </XrThemeProvider>
    </XrBox>
  </XrWindow>

  <!-- Opens in front of the viewer, wherever they look. -->
  <XrDialog v-model:open="confirmOpen" title="Delete everything?" @close="danger = 'Kept'">
    <XrText muted>The count goes back to zero. This cannot be undone.</XrText>
    <template #actions>
      <XrButton variant="secondary" @click="(danger = 'Kept'), (confirmOpen = false)">Cancel</XrButton>
      <XrButton @click="(count = 0), (danger = 'Deleted'), (confirmOpen = false)">Delete</XrButton>
    </template>
  </XrDialog>

  <XrDialog v-model:open="clearOpen" name="clear-dialog" title="Clear history?">
    <XrText muted>Fields behind this dialog cannot take focus while it is open.</XrText>
    <XrTextField v-model="clearNote" name="note" placeholder="A note (optional)" />
    <template #actions>
      <XrButton name="clear-cancel" variant="secondary" @click="clearOpen = false">Cancel</XrButton>
      <XrButton @click="sureOpen = true">Clear</XrButton>
    </template>
  </XrDialog>
  <XrDialog v-model:open="sureOpen" name="sure-dialog" title="Really clear?" :width="400">
    <XrText muted>{{ sent.length }} sent messages go away.</XrText>
    <template #actions>
      <XrButton variant="secondary" @click="sureOpen = false">Keep</XrButton>
      <XrButton @click="clearHistory">Yes, clear</XrButton>
    </template>
  </XrDialog>

  <!-- A second window: the keyboard, below the main one while typing.
       Quest Browser opens its system keyboard instead, so then there is none. -->
  <XrWindow v-if="tab === 'Type' && !xr.systemKeyboard.value" name="keyboard-window" :position="[0, 1.02, -0.8]">
    <XrKeyboard v-model:layout="language" name="keyboard" :layouts="[...languages]" enter-label="Send" />
  </XrWindow>
</template>
