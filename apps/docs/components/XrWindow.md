# <code>&lt;XrWindow&gt;</code>

A panel with a handle bar. Grab the bar with a ray, a pinch or the mouse to move the window; it turns to face you. `v-model:position` keeps where it was put, so you can save and restore a layout.

<LiveDemo demo="window" />

## Usage

```vue
<XrWindow v-model:position="position" :width="440">
  <XrText variant="title">Drag the bar below</XrText>
</XrWindow>
```

## API

<!--@include: ./api/XrWindow.md-->
