# What is vue-xr-ui

vue-xr-ui is a Vue 3 component library for interfaces that live in 3D space:
VR apps, mixed-reality dashboards, tools in the headset. You write
`<XrPanel>`, `<XrButton>` and `v-model` the same way you write a web app, and
get panels with flexbox layout, crisp text, themes, and controls that react
to every XR input.

It targets:

- **Meta Quest 3** standalone, in the Quest browser (VR and passthrough MR),
- **PC VR** through a desktop browser with WebXR (SteamVR, Quest Link),
- **a regular screen** with a mouse, so the same app works without a headset.

## How it is built

```
Vue app (DOM)                     <XrEnterButton>, useXr()
  └─ createXrUi() plugin          app-wide XR controller + theme
      └─ <TresCanvas>             TresJS: Vue renderer for three.js
          └─ <XrScene>            @pmndrs/xr store, XR-safe frame loop
              └─ <XrPanel>        @pmndrs/uikit root: yoga flexbox, MSDF text
                  ├─ <XrText>
                  └─ <XrButton>
```

- **Layout and text**: [@pmndrs/uikit](https://github.com/pmndrs/uikit), yoga flexbox and MSDF text, instanced so a whole UI is a few draw calls.
- **Input**: [@pmndrs/xr](https://github.com/pmndrs/xr) pointer events: rays, grab and touch, all as DOM-like pointer events.
- **Rendering**: [TresJS](https://tresjs.org) and three.js.
- **Emulator**: [IWER](https://github.com/meta-quest/immersive-web-emulation-runtime), a virtual Quest 3 on localhost and in CI.

## Status

Pre-1.0: the API can still change between minor versions. The
[roadmap](https://github.com/ovchinnikov-lxs/vue-xr-vr/milestones) shows what
is planned for 1.0.
