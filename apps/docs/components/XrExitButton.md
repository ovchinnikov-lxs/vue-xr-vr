# <code>&lt;XrExitButton&gt;</code>

A button in the scene that ends the XR session. It shows only while a session runs and reads **Exit VR** or **Exit AR** by itself. It is an `<XrButton>` underneath, so it takes a ray, a pinch and a fingertip poke.

Every immersive app needs a way out that works with hands alone. The system gestures differ between headsets and browser versions (on Quest the left palm pinch is meant to end the session, but does not always), so put one exit where the user always finds it: in the header of the main window, or in an [`<XrHandMenu>`](./XrHandMenu). [`<XrSessionMenu>`](./XrSessionMenu) adds a palm-pinch gesture that asks to exit.

## Usage

```vue
<XrWindow :position="[0, 1.4, -1]">
  <XrBox direction="row" justify="space-between" align="center">
    <XrText variant="headline">My app</XrText>
    <XrExitButton />
  </XrBox>
  ...
</XrWindow>
```

`label`, `variant` (default `secondary`), `size` (default `sm`) and `block` work as on `<XrButton>`. `@exit` fires as the session starts to end.

There is no live demo on this page: the button only shows inside a session. The [playground](https://vue-xr-vr.vercel.app) has one in the main window's header.

## API

<!--@include: ./api/XrExitButton.md-->
