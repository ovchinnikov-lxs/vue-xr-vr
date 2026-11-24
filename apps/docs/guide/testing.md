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

### Mixed reality in a synthetic room

With `room` set, the emulator puts a scanned room around the user:
passthrough shows it, and its walls, floor, tables and couch come back as
detected planes, so snapping, anchors and hit tests work like on a Quest.
`apps/playground/e2e/mr.spec.ts` enters passthrough, turns and moves the
emulated head, carries windows onto walls and tables with a ray and a
pinch, reloads the page to check that anchors come back, and turns a hand's
palm to open the hand menu. A few things to know:

- Prefer the scanned rooms (`living_room`, `office_small`...) in CI: the
  furnished ones (`kitchen`...) are nicer to look at but render at a few
  frames per second in software GL.
- Persistent anchors are kept in `localStorage`, so a `page.reload()` in
  the same test is a new session on the same headset.
- The emulator's recenter moves the user to the origin instead of moving
  the origin under the user, so it cannot show an anchor holding still
  while the floor origin moves; check the restore path instead.
