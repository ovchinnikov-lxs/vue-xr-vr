# <code>&lt;XrFollow&gt;</code>

Keeps what it wraps in view: a HUD, a status card, a menu that should never get lost behind the user. It sits in front of the viewer and turns to face them. Lazy by default, like the Quest system UI: it stays put while you look around a little and glides back once it drifts more than `angle` degrees from where you look.

<LiveDemo demo="follow" />

## Usage

```vue
<XrFollow :distance="0.8" :height="-0.15">
  <XrPanel :width="320">
    <XrText>Recording…</XrText>
  </XrPanel>
</XrFollow>
```

- Children are placed relative to the follow point, so a panel inside needs no `position`.
- It follows turns and steps but not nods: it stays level, at `height` metres from your eyes.
- `:angle="0"` follows every turn, smoothed (a head-locked HUD). Use it sparingly: content glued to the head is tiring.
- `:active="false"` pins it where it is; bind it to a toggle so the user can leave the panel in a spot.
- It jumps straight in front when a session starts or ends and when the user recentres.

## API

<!--@include: ./api/XrFollow.md-->
