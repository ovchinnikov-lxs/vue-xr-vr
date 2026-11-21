# Testing in an emulator

On `localhost`, `<XrScene>` injects [IWER](https://github.com/meta-quest/immersive-web-emulation-runtime),
a virtual Quest 3, when no headset is found. **Enter VR** and **Enter AR** then
work on a desktop, with emulated controllers, hands and a synthetic room for
MR.

```vue
<XrScene :emulator="{ device: 'metaQuest3', room: 'living_room' }" />
<XrScene :emulator="false" />
```

## End-to-end tests

The repository's own tests drive the playground in headless Chromium with the
emulator, like a user: they click with the mouse, enter VR and AR, aim
controller rays, pinch and poke with hands. See `apps/playground/e2e` for
examples to copy into your app's tests.

```bash
pnpm --filter playground exec playwright install chromium   # once
pnpm test:e2e
```
