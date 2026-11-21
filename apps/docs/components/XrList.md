# <code>&lt;XrList&gt;</code>

A scrolling list. Drag with a ray or a finger, or use the mouse wheel. Items have a label, a description and a `selected` state, and a drag never selects. `<XrListItem>` is documented on this page too.

<LiveDemo demo="list" />

## Usage

```vue
<XrList :max-height="220">
  <XrListItem
    v-for="track in tracks"
    :key="track.title"
    :label="track.title"
    :description="track.artist"
    :selected="playing === track.title"
    @click="playing = track.title"
  />
</XrList>
```

## API

<!--@include: ./api/XrList.md-->

## `<XrListItem>`

<!--@include: ./api/XrListItem.md-->
