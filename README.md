# vue-xr-ui

Vue components for building VR and mixed-reality interfaces on the web.
Write spatial UI the way you write a Vue app: components, props, events,
design tokens. It runs in the Meta Quest 3 browser (standalone), in PC VR
through a desktop browser, and on a regular screen with a mouse.

```vue
<XrPanel :position="[0, 1.45, -1]" :width="440">
  <XrText variant="headline">Hello, XR</XrText>
  <XrButton @click="count++">Clicked {{ count }} times</XrButton>
</XrPanel>
```

One `click` event works for every input: mouse, controller ray, hand pinch,
and poking the button with a fingertip.

> Status: early prototype. API will change.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

On localhost without a headset, a virtual Quest 3 ([IWER](https://github.com/meta-quest/immersive-web-emulation-runtime))
is injected, so **Enter VR** / **Enter AR** work on a desktop, with
emulated controllers, hands and a synthetic room for MR.

### On a Quest 3

WebXR needs HTTPS outside localhost.

```bash
pnpm --filter playground dev:https   # self-signed cert, exposed on your LAN
```

Open `https://<your-computer-ip>:5173` in the Quest browser, accept the
certificate warning, press **Enter VR**.

## Packages

| Package | What it is |
| --- | --- |
| [`vue-xr-ui`](packages/vue-xr-ui) | Components and composables. |
| [`@vue-xr-ui/tokens`](packages/tokens) | Framework-agnostic design tokens and themes. |
| [`playground`](apps/playground) | Demo app, the first scene. |

## Architecture in one picture

```
Vue app (DOM)                     <XrEnterButton>, useXr()
  └─ createXrUi() plugin          app-wide XR controller + theme
      └─ <TresCanvas>             TresJS: Vue renderer for three.js
          └─ <XrScene>            @pmndrs/xr store, XR-safe frame loop
              └─ <XrPanel>        @pmndrs/uikit root: yoga flexbox, MSDF text
                  ├─ <XrText>
                  └─ <XrButton>
```

- **Layout** is [`@pmndrs/uikit`](https://github.com/pmndrs/uikit):
  yoga flexbox, MSDF text, instanced panels (a whole UI is a few draw calls).
- **Input** is [`@pmndrs/xr`](https://github.com/pmndrs/xr) and its pointer
  events: rays, grab, touch (poke), all as DOM-like pointer events.
- **Rendering** is [TresJS](https://tresjs.org) and three.js.
- **Units** are dmm (1 mm seen from 1 m). A panel at 2 m is scaled 2x so
  it reads the same. Tokens are in dmm, so `fontSize: 18` means 18 dmm.

## Components (v0)

| Component | Purpose |
| --- | --- |
| `<XrScene>` | Put inside `<TresCanvas>`. Owns the XR session, input and frame loop. |
| `<XrPanel>` | Floating surface, flex container with theme background. |
| `<XrBox>` | Transparent flex container (the `<div>`). |
| `<XrText>` | Text in the theme's type scale. |
| `<XrButton>` | `primary` / `secondary` / `ghost`, `sm` / `md` / `lg`, `disabled`. |
| `<XrEnterButton>` | DOM button to enter/exit VR or AR. |

Composables: `useXr()` (session state, `enterVR`, `enterAR`, `exit`),
`useXrFrame(cb)` (per-frame callback that also runs inside the headset),
`useXrTheme()` (read or switch the theme).

## Roadmap

1. Components: slider, toggle, list, tooltip, tabs, keyboard.
2. Grabbable and follow-the-user panels, billboard, snap to wall/table (MR planes and anchors).
3. Focus and keyboard navigation, accessibility.
4. Playground as an in-headset Storybook.
5. Demo app (Home Assistant dashboard in MR), docs site, npm release.

## License

MIT
