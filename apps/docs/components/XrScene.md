# <code>&lt;XrScene&gt;</code>

Turns a `<TresCanvas>` into an XR-capable scene. Place it directly inside `<TresCanvas>`; every vue-xr-ui component must live below it. It owns the XR session store, controllers and hands, and a frame loop that keeps running inside the headset.

## Usage

```vue
<TresCanvas window-size>
  <TresPerspectiveCamera :position="[0, 1.5, 0.1]" :look-at="[0, 1.4, -1]" />
  <XrScene :options="{ handTracking: true }" @session-start="onStart">
    <!-- panels, windows, your 3D content -->
  </XrScene>
</TresCanvas>
```

In a passthrough (`immersive-ar`) session it clears to transparent so the room shows through, and it emits `recenter` when the user recentres the view. See [Mixed reality](/guide/mixed-reality).

## API

<!--@include: ./api/XrScene.md-->
