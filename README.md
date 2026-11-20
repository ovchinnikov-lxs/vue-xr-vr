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

The playground is deployed to Vercel on every push to `main`:
open https://vue-xr-vr.vercel.app in the Quest browser and press Enter VR.

To try local changes instead:

WebXR needs HTTPS outside localhost.

```bash
pnpm --filter playground dev:https   # self-signed cert, exposed on your LAN
```

Open `https://<your-computer-ip>:5173` in the Quest browser, accept the
certificate warning, press **Enter VR**.

## Tests

End-to-end tests drive the playground in headless Chromium with an emulated
Quest 3: they click with the mouse, enter VR and AR, and press buttons with
controller rays. They run in CI on every push.

```bash
pnpm --filter playground exec playwright install chromium   # once
pnpm test:e2e
```

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
| `<XrWindow>` | A panel with a handle bar: grab it with a ray, a pinch or the mouse to move it; it turns to face you. `v-model:position`. |
| `<XrBox>` | Transparent flex container (the `<div>`). |
| `<XrText>` | Text in the theme's type scale. |
| `<XrButton>` | `primary` / `secondary` / `ghost`, `sm` / `md` / `lg`, `disabled`. |
| `<XrToggle>` | On/off switch with a label, `v-model`. |
| `<XrSlider>` | Number in a range, `v-model`, `min` / `max` / `step`. Drag with a ray or slide a fingertip along it. |
| `<XrTabs>` | Segmented tabs, `v-model`. Switches a value; show the content with `v-if`. |
| `<XrList>` / `<XrListItem>` | Scrolling list (drag with a ray or finger, mouse wheel); items have label, description, `selected`. A drag never selects. |
| `<XrTooltip>` | Hint shown while a ray, fingertip or mouse hovers what it wraps. |
| `<XrTextField>` | Single-line text input, `v-model`, `placeholder`, `type="password"`. Real caret: tap where to type. Physical keyboard works on desktop. Enter emits `submit`. |
| `<XrKeyboard>` | On-screen keyboard. `layouts`: built-in `en` `ru` `uk` `de` `fr` `es` and/or your own (`{ label, name, locale, rows }`), `v-model:layout`, `digits`, `symbols` (?123 page), `spaceLabel`, `keySize`, `enterLabel`. Shift (double tap for caps lock), held Backspace repeats. Types into the last focused `<XrTextField>`, or edits its own `v-model`. |
| `<XrThemeProvider>` | A theme for everything inside it: `theme` and/or `accent`. |
| `<XrEnterButton>` | DOM button to enter/exit VR or AR. |

Every control takes the same input: mouse, controller ray, hand pinch ray and
a fingertip poke. A press counts on release however long it is held, and a
control keeps the pointer until release (like DOM pointer capture).

Composables: `useXr()` (session state, `enterVR`, `enterAR`, `exit`),
`useXrFrame(cb)` (per-frame callback that also runs inside the headset),
`useXrTheme()` (read or switch the theme).

Themes: `darkTheme`, `lightTheme`, `defineTheme(base, overrides)`, and
`withAccent(theme, '#22c55e')`, which derives hover, pressed, text-on-accent
(by contrast) and focus colours from one hex value.

Text renders in Inter with Latin (incl. French, German, Spanish letters) and Cyrillic (Russian, Ukrainian) (uikit's bundled fonts are
Latin only). Each weight loads on first use, about 250 KB.

## Roadmap

1. Components: dialog, select, number input.
2. Follow-the-user panels, billboard, snap to wall/table (MR planes and anchors).
3. Focus and keyboard navigation, accessibility.
4. Playground as an in-headset Storybook.
5. Demo app (Home Assistant dashboard in MR), docs site, npm release.

## License

MIT
