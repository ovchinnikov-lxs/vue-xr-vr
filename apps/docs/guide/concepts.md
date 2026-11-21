# Core concepts

## The scene

`<XrScene>` goes directly inside `<TresCanvas>`. It creates the XR session
store, input sources and a frame loop that keeps running inside the headset
(the browser's `requestAnimationFrame` stops in an XR session). Every
vue-xr-ui component must be below it.

## Roots and children

A component with a `position` is a **root**: a surface in the 3D scene
(`<XrPanel>`, `<XrWindow>`, or a root `<XrKeyboard>`). Everything inside a
root is laid out with flexbox, like a `<div>` tree:

```vue
<XrPanel :position="[0, 1.45, -1]" :width="440" :gap="4">
  <XrBox direction="row" justify="space-between">
    <XrText variant="title">Settings</XrText>
    <XrButton size="sm" variant="ghost">Close</XrButton>
  </XrBox>
</XrPanel>
```

## Units: dmm

Sizes are in **dmm**: one dmm is a millimetre seen from one metre away.
A root at 2 m is scaled 2x so it reads the same, so `fontSize: 18` always
looks like 18 px text on a laptop at arm's length. Positions in the scene
(`:position`) are metres, as in three.js.

Rules of thumb for comfortable XR UI, all built into the themes:

| | Value |
| --- | --- |
| Smallest text | 14 dmm (caption) |
| Body text | 18 dmm |
| Smallest target you can poke | 44 dmm (`theme.interaction.minTarget`) |
| Panel distance | 0.7 m to 1.5 m |

## The `ui` prop

Every component takes `ui`: raw [uikit properties](https://pmndrs.github.io/uikit/docs/)
merged over the component's own. It is the escape hatch for one-off layout
and style:

```vue
<XrSlider v-model="volume" :ui="{ flexGrow: 1 }" />
```

## Frame callbacks

`useXrFrame((delta, frame) => {})` runs every frame, in the browser and in
the headset. Use it instead of TresJS `useLoop` for anything that must keep
moving in XR.
