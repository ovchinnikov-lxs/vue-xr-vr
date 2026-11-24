# Mixed reality

On a Quest 3 (or Quest Pro) the same scene runs in **passthrough**: the room
is visible around your UI. vue-xr-ui adds what an MR app needs on top of a
VR one: a transparent background, panels that follow you or stay where you
put them in the room, snapping to walls and tables, and a menu on your wrist.

## Passthrough

Start an `immersive-ar` session. `<XrEnterButton mode="auto">` starts
passthrough where the device has it and VR elsewhere:

```vue
<XrEnterButton mode="auto" />
```

or from code: `useXr().enterAR()`.

In an AR session `<XrScene>` clears the canvas to transparent and hides
`scene.background`, so the camera feed shows through wherever nothing is
drawn; both come back when the session ends. Anything opaque you draw (a
skybox, a floor) still hides the room, so leave them out or `v-if` them on
`useXr().mode.value !== 'immersive-ar'`. `:passthrough="false"` keeps the
canvas colour.

### Where the origin is

Sessions use the `local-floor` reference space: the origin is on the floor
where the user stood when the session started, `-z` is the way they faced.
So `[0, 1.45, -1]` is a metre in front of them at eye height, in VR and in
passthrough. When the user recentres (holds the Meta button), `<XrScene>`
emits `recenter`: content placed in front of the user can be placed again.
For content that must stay at a spot in the room across recentres and
sessions, use anchors (below).

Room-scale (`bounded-floor`) is one option away:
`<XrScene :options="{ bounded: true }">`; the session then needs a
boundary set up on the headset.

### Trying it without a headset

On `localhost` the emulated Quest 3 loads a synthetic room (`living_room` by
default) and Enter AR shows it behind the UI. Pick another one:

```vue
<XrScene :emulator="{ room: 'kitchen' }">
```

Scanned rooms: `living_room`, `office_small`, `office_large`,
`meeting_room`, `music_room`. Furnished rooms: `kitchen`, `bedroom`,
`home_office`, `conference_room`, `music_studio`, `open_office`,
`open_studio`, `sunlit_living_room`.

## Panels that follow you

`<XrFollow>` keeps a HUD in view; `<XrBillboard>` keeps a label in place
but turned toward you:

```vue
<XrFollow :distance="0.8" :height="-0.2">
  <XrPanel :width="300">
    <XrToggle v-model="follow">Follow me</XrToggle>
  </XrPanel>
</XrFollow>

<XrBillboard :position="[1.2, 1.1, -2]">
  <XrPanel :width="160"><XrText>Lamp</XrText></XrPanel>
</XrBillboard>
```

The follow is lazy: small head movements leave the panel where it is, a real
turn brings it back. That is calmer than a head-locked HUD and still keeps
it reachable. Give the user a way to pin it (`:active="false"`).

## Walls and tables

A Quest 3 knows the room from its space setup: walls, floor, ceiling,
tables, couches, windows and doors, each a **plane** with a label. Windows
can snap to them:

```vue
<XrWindow snap :width="320" @snap="(label) => (stuckTo = label)">
  <XrText>Carry me to a wall</XrText>
</XrWindow>
<XrPlanes v-if="showSurfaces" :labels="['wall', 'table']" />
```

With `snap`, a window carried within `snapDistance` (15 cm) of a wall lies
flat on it, facing into the room; over a table it stands on its bottom
edge, facing you. `useXrPlanes()` gives you the planes to place your own
content. Plane detection is requested by `<XrScene>` as an optional
feature, so the session starts on devices without it; the list is simply
empty there.

The first time a site asks for planes the Quest shows a permission prompt
("spatial data"); without a room setup there are no planes. In the
emulator every synthetic room has them.

## Anchors: staying put in the room

The floor origin moves when the user recentres or starts the next session
somewhere else, so a position in scene metres is not a place in the room.
An **anchor** is: the headset tracks it against the room itself. On a
Quest, anchors can be **persistent**, so the panel is still on that wall
tomorrow.

```vue
<!-- a window remembers where it was put down -->
<XrWindow anchor="notes" snap>...</XrWindow>

<!-- any content, pinned from code -->
<XrAnchor id="dashboard" :position="[0, 1.4, -1]" v-slot="{ place, saved }">
  <XrPanel><XrButton v-if="!saved" @click="place()">Pin here</XrButton></XrPanel>
</XrAnchor>
```

```ts
const notes = useXrAnchor('notes')
notes.saved.value // something is saved
notes.forget() // reset the layout
```

What is stored, under `localStorage['vue-xr-ui:anchors']`: the headset's
persistent anchor handle and the pose in the floor space. When the
headset knows the handle, the anchor wins; when it does not (another room,
PC VR, the desktop, cleared data) the pose stands in. The Quest asks for
the "spatial data" permission the first time.
