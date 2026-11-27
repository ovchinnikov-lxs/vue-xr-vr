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

## Sharpness

By default a session renders at the headset's native resolution (`frameBufferScaling: 'high'`) with no fixed foveation (`foveation: 0`). The browser's own defaults are softer: Quest Browser's framebuffer is smaller than the display, and three.js turns foveation all the way up, which blurs everything away from the centre of each lens. For a scene that is mostly UI the GPU has room for it. A heavy 3D scene can trade some sharpness back:

```vue
<XrScene :options="{ frameBufferScaling: 'mid', foveation: 0.5 }">
```

## Mixed reality

In a passthrough (`immersive-ar`) session it clears to transparent so the room shows through, and it emits `recenter` when the user recentres the view. See [Mixed reality](/guide/mixed-reality).

## API

<!--@include: ./api/XrScene.md-->
