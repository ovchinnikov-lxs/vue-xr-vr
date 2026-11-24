# <code>&lt;XrHandMenu&gt;</code>

A menu on the wrist. It shows above your hand when you turn the palm toward your face and goes away when you turn it back, like the Quest system menu. Poke it with the other hand's fingertip. Only tracked hands open it: there is no live demo here because a mouse has no palm. Try it in the [playground](https://vue-xr-vr.vercel.app/?scene=mr) on a Quest, with hands.

## Usage

```vue
<XrHandMenu hand="left" @open="opened++">
  <XrPanel :width="240">
    <XrButton @click="recenterContent">Bring panels here</XrButton>
    <XrToggle v-model="showSurfaces">Surfaces</XrToggle>
  </XrPanel>
</XrHandMenu>
```

- `angle` (50°) is how far the palm may turn away from your eyes before the menu closes; it opens 15° inside that, so it does not flicker at the edge.
- `offset` places it relative to the palm: `[toward the thumb, up, out of the palm]`, in metres. The default floats it 12 cm above the hand, facing you.
- The content is mounted only while the menu is open: keep state that must survive in the parent (as with `v-if`).
- Controllers never open it. If your app supports controllers too, give the same actions another place.

## API

<!--@include: ./api/XrHandMenu.md-->
