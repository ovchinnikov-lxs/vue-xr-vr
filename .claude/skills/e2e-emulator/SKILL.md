---
name: e2e-emulator
description: Run, write and debug the Playwright e2e tests that drive the playground in an emulated Quest 3 (IWER) — locally in the cloud sandbox and in CI.
---

# E2E in the emulated Quest 3

## How it works

- Playwright opens the playground at `/?e2e`: the IWER emulator is injected
  headless (no dev UI, no room) and `window.__xrTest` (src/e2e/TestHook.ts,
  dev builds only) exposes helpers: find UI by its text label or `#name`,
  project it to screen pixels, aim rays, pinch, poke, move hands.
- `e2e/fixtures.ts` wraps the bridge in a typed `Scene` (`scene.click`,
  `scene.rayClick`, `scene.poke`, `scene.rayDrag`, `scene.expectText`...).
- Controller and hand models come from `e2e/assets/webxr-input-profiles`
  (the jsDelivr CDN is not reachable from every sandbox).
- WebGL is software-rendered (`--use-angle=swiftshader`).

## Run

Cloud sandbox (Chromium is preinstalled, do not `playwright install`):

```bash
cd apps/playground
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test --trace off            # all
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/controls.spec.ts --trace off -g "fingertip"
```

Elsewhere: `pnpm --filter playground exec playwright install chromium` once,
then `pnpm test:e2e`. CI: the `e2e` job in `.github/workflows/ci.yml`
(ubuntu-24.04), uploads `playwright-report` on failure. Read CI logs with the
GitHub MCP tools (`actions_list` → `get_job_logs` with `failed_only`).

## Write a test

- One `describe` for the browser (mouse), one for the emulated Quest 3
  (`beforeEach`: `scene.emulatorReady()`, click **Enter VR**, poll
  `presenting: true`).
- Find things by visible text, or by `name` for parts (`'#volume.track'`).
- Wait on conditions, never fixed sleeps: `scene.expectText`, `expect.poll`,
  `aimUntilHovered`, `scene.frames(n)`. Lists coast after a drag: wait for
  them to stop before tapping. Rays need a few frames to land on a target.
- Cover: mouse, controller ray, and for controls a hand poke
  (`scene.setInputMode('hand')`).
- Mixed reality: `test.use({ scenePath: '/?e2e&scene=mr&room=living_room',
  readyLabel: 'Mixed reality' })` opens `scenes/MixedReality.vue` in a
  synthetic room (see `e2e/mr.spec.ts`). Helpers: `turnHead`, `moveHead`,
  `recenter`, `head`, `seenAt`, `facingAngle`, `planes`, `poseHand`,
  `renderState`. Use scanned rooms (`living_room`); the furnished ones
  (`kitchen`) render at ~2 fps in software GL. IWER's `recenter()` moves
  the user, not the room, so it cannot tell an anchor from a stored pose:
  spoil the stored pose instead (see the anchors test).

## When it fails

Use the `e2e-debugger` agent. Re-run only the failing spec while fixing; never
skip or weaken a test to get green.
