<script setup lang="ts">
import { computed, ref } from 'vue'
import { XrAnchor, XrBillboard, XrBox, XrButton, XrFollow, XrHandMenu, XrPanel, XrPlanes, XrText, XrToggle, XrWindow, useXr, useXrAnchor } from 'vue-xr-ui'

const xr = useXr()
const status = computed(() => {
  if (!xr.isPresenting.value) return 'In the browser'
  return xr.mode.value === 'immersive-ar' ? 'Passthrough' : 'In VR'
})

// The HUD follows lazily; switch it off to leave it where it is.
const follow = ref(true)
const hudState = ref('Settled')

// A note you can stick to a wall or stand on a table.
const showSurfaces = ref(true)
const stuckTo = ref<string | null>(null)
const lastStuck = ref<string | null>(null)
function onSnap(label: string | null) {
  stuckTo.value = label
  if (label) lastStuck.value = label
}
// The note is anchored: it comes back where it was put, next session too.
const noteAnchor = useXrAnchor('note')

// A card that stays where it was pinned: nudge it, pin it, reload.
const cardOffset = ref(0)
const cardPosition = computed<[number, number, number]>(() => [-0.75 + cardOffset.value, 1.05, -1.1])

// Turn the left palm toward your face: a menu on the wrist.
const menuOpen = ref(false)
const taps = ref(0)

const noteState = computed(() => (stuckTo.value ? `On the ${stuckTo.value}` : lastStuck.value ? `Was on the ${lastStuck.value}` : 'Floating'))
</script>

<template>
  <XrPanel name="mr-intro" :position="[0, 1.45, -1]" :width="440">
    <XrText variant="headline">Mixed reality</XrText>
    <XrText muted>Enter AR on a Quest 3: the room shows through behind the UI.</XrText>
    <XrText variant="label">{{ status }}</XrText>
  </XrPanel>

  <XrBillboard :position="[-0.7, 1.35, -1.1]" axis="all">
    <XrPanel name="tag" :width="180" :padding="3">
      <XrText variant="label">Faces you</XrText>
    </XrPanel>
  </XrBillboard>

  <XrFollow :active="follow" :distance="0.9" :height="-0.35" @follow="hudState = 'Following'" @settle="hudState = 'Settled'">
    <XrPanel name="hud" :width="300" :padding="3" :gap="2">
      <XrToggle v-model="follow">Follow me</XrToggle>
      <XrToggle v-model="showSurfaces">Show surfaces</XrToggle>
      <XrButton name="forget-note" variant="secondary" size="sm" :disabled="!noteAnchor.saved.value" @click="noteAnchor.forget()">Forget note place</XrButton>
      <XrText variant="caption" muted>{{ follow ? hudState : 'Pinned' }}</XrText>
    </XrPanel>
  </XrFollow>

  <XrHandMenu hand="left" @open="menuOpen = true" @close="menuOpen = false">
    <XrPanel name="hand-menu" :width="240" :padding="3" :gap="2">
      <XrText variant="label">Hand menu</XrText>
      <XrButton name="menu-tap" size="sm" @click="taps++">Tapped {{ taps }}</XrButton>
      <XrToggle v-model="showSurfaces">Surfaces</XrToggle>
    </XrPanel>
  </XrHandMenu>

  <XrPlanes v-if="showSurfaces" :labels="['wall', 'table']" />

  <XrAnchor id="card" :position="cardPosition" v-slot="{ place, forget, saved }">
    <XrPanel name="card" :width="300" :padding="3" :gap="2">
      <XrText variant="label">{{ saved ? 'Pinned card' : 'Loose card' }}</XrText>
      <XrBox direction="row" :gap="2">
        <XrButton name="nudge" variant="secondary" size="sm" @click="cardOffset += 0.1">Nudge</XrButton>
        <XrButton v-if="!saved" name="pin" size="sm" @click="place()">Pin here</XrButton>
        <XrButton v-else name="unpin" variant="ghost" size="sm" @click="forget()">Unpin</XrButton>
      </XrBox>
    </XrPanel>
  </XrAnchor>

  <XrWindow name="note" anchor="note" :position="[0.5, 1.25, -1.1]" :width="300" :padding="4" snap @snap="onSnap">
    <XrText variant="title">Sticky note</XrText>
    <XrText muted>Carry me to a wall or a table.</XrText>
    <XrText variant="caption" name="note-state">{{ noteState }}</XrText>
  </XrWindow>
</template>
