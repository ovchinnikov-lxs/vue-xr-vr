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
