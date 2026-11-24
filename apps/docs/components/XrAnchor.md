# <code>&lt;XrAnchor&gt;</code>

Keeps what it wraps at a spot in the room, across sessions and page reloads: the dashboard stays on the kitchen wall. On a Quest it is a persistent WebXR anchor, which the headset keeps glued to the room even after a recentre; elsewhere (PC VR, the desktop) it saves the pose in the floor space. Until something is placed under its `id`, the content sits at `position`.

<LiveDemo demo="anchor" />

## Usage

```vue
<XrAnchor id="dashboard" :position="[0, 1.4, -1]" v-slot="{ place, forget, saved }">
  <XrPanel :width="400">
    <XrButton v-if="!saved" @click="place()">Pin here</XrButton>
    <XrButton v-else @click="forget()">Unpin</XrButton>
  </XrPanel>
</XrAnchor>
```

- `place()` anchors the content where it is now; `place(position, quaternion)` puts it somewhere else (world space, three.js `Vector3` and `Quaternion`). Both are also on the component's ref.
- `forget()` drops the saved spot; the content goes back to `position`.
- Saved spots live in `localStorage` under `vue-xr-ui:anchors`, one entry per `id`.
- For a window the user carries, use [`<XrWindow anchor="name">`](./XrWindow#remembering-where-it-was-put): it anchors where it is put down.
- In code: `useXrAnchor(id)` returns `{ matrix, anchored, saved, place, forget }`.

## API

<!--@include: ./api/XrAnchor.md-->
