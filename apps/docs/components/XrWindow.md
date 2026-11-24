# <code>&lt;XrWindow&gt;</code>

A panel with a handle bar. Grab the bar with a ray, a pinch or the mouse to move the window; it turns to face you. `v-model:position` keeps where it was put, so you can save and restore a layout.

<LiveDemo demo="window" />

## Usage

```vue
<XrWindow v-model:position="position" :width="440">
  <XrText variant="title">Drag the bar below</XrText>
</XrWindow>
```

## Snapping to walls and tables

In a passthrough session on a Quest 3, `snap` makes the window stick to real surfaces from the room setup while it is carried: flat on a wall, facing into the room, or standing on a table, facing you. Pull it away to take it off.

```vue
<XrWindow snap @snap="(label) => (stuckTo = label)">...</XrWindow>
<!-- or only some surfaces -->
<XrWindow :snap="['wall', 'window']" :snap-distance="0.2">...</XrWindow>
```

`place` fires on release with the window's world position and yaw.

## Remembering where it was put

`anchor="name"` keeps the window where the user puts it down, across sessions and reloads: a persistent anchor on a Quest, so it stays on that wall even after a recentre; the saved pose elsewhere. Once placed it wins over `position`.

```vue
<XrWindow anchor="notes" snap :position="[0.5, 1.3, -1]">...</XrWindow>
```

```ts
// a "reset layout" button
useXrAnchor('notes').forget()
```

## API

<!--@include: ./api/XrWindow.md-->
