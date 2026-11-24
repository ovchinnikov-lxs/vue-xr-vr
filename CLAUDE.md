# CLAUDE.md

Guide for Claude Code (and humans) working in this repo. Read it first, every
session. Keep it true: when something here turns out wrong, fix it in the
same commit.

## What we are building and where it ends

`vue-xr-ui`: a Vue 3 component library for WebXR (VR + mixed reality) on
TresJS / three.js, for the Meta Quest 3 browser, PC VR and desktop.
It is Aleksandr's portfolio project on the way to becoming an XR engineer.

**The end result is a library, not a playground.** 1.0 is done when the
definition of done at the top of [`.github/roadmap.yml`](.github/roadmap.yml)
holds: published on npm with types, a live docs site with a page, a demo and
an API table for every component, e2e tests for every component, MR
(passthrough, anchors), a deployed demo app with a video, and releases with a
CHANGELOG. Every task should move one of those forward.

## People and workflow

- Aleksandr writes in Russian: answer in Russian. Code, comments, commits and
  docs are in English.
- **Push straight to `main`.** No PRs, no feature branches (unless he asks).
  Claude reviews its own diff before pushing (use the `reviewer` agent for
  anything non-trivial). Aleksandr only tests on the headset.
- Every push to `main` deploys the playground to https://vue-xr-vr.vercel.app
  (Vercel project `vue-xr-vr`) and the docs to https://vue-xr-ui.vercel.app
  (Vercel project `vue-xr-ui-docs`, domain vue-xr-ui.vercel.app, root `apps/docs`).
  Things only a headset can show get the `needs-headset` label; tell
  Aleksandr exactly what to check there.
- Commits: imperative, specific subject (`Add XrDialog`, `E2E: wait for the
  list to stop coasting`), body says why. `Closes #N` closes the issue.

## Planning: where we are, what is next

- Plan as code: [`.github/roadmap.yml`](.github/roadmap.yml) has the
  definition of done, milestones (0.1 Foundation → 0.2 Components → 0.3 Docs
  site → 0.4 Mixed reality → 0.5 Demo app → 1.0 Release) and issues.
  The `Roadmap` workflow syncs it to GitHub labels, milestones, issues and the
  Project board "vue-xr-ui roadmap". Additive only.
- After an issue exists, **GitHub is the source of truth** for its state.
  To see where we are: list open issues by milestone (GitHub MCP
  `list_issues`), or https://github.com/ovchinnikov-lxs/vue-xr-vr/milestones.
- New work: add it to `roadmap.yml` (title, milestone, labels, body with a
  "done when") and push; the workflow creates the issue.
- Work the lowest open milestone first unless Aleksandr says otherwise.
- `/next` (skill `next-task`) picks the next issue and plans it.

## After every task: wrap-up (mandatory)

Aleksandr's rule: after every task, and before a session ends, Claude
analyses what was done and brings the plan up to date. Run the `wrap-up`
skill:

1. close the issues the work finished, comment progress on the ones it moved,
   create issues for everything discovered (and add them to roadmap.yml);
2. write `journal/YYYY-MM-DD.md`: Done / How / Learned / Issues / Next;
3. commit `Journal: ...`, push, and tell Aleksandr in Russian what changed.

It is enforced: the **Stop hook** (`.claude/hooks/wrap-up-check.mjs`) blocks
ending a turn while commits or changes are not covered by the journal; the
**SessionStart hook** shows the last "Next" and pending commits; the CI
**traceability** job warns about commits with no `#N` and pushes with no
journal entry. A pure question with no work needs no wrap-up: say so and stop.

## Repo map

```
packages/vue-xr-ui/      the library (what goes to npm)
  src/components/        one file per component: Xr<Name>.ts (render functions, no SFCs)
  src/runtime/           node.ts (uikit <-> Vue binding), press.ts (input), layout.ts (shared flex props),
                         controller.ts / context.ts (session), emulator.ts (IWER), fonts.ts, speech.ts
  src/composables/       useXr, useXrFrame, useXrTheme
  src/index.ts           public API: everything exported here is public and documented
packages/tokens/         @vue-xr-ui/tokens: themes and tokens, no Vue
apps/playground/         dev app + the e2e target (deployed to Vercel)
  src/scenes/HelloPanel.vue   the scene the e2e tests drive
  src/e2e/TestHook.ts         window.__xrTest bridge (dev only)
  e2e/*.spec.ts               Playwright specs; fixtures.ts = Scene helper
apps/docs/               VitePress docs site
  guide/*.md, components/<Name>.md, demos/<demo>.vue (live 3D demos)
  scripts/api.mjs        generates components/api/<Name>.md from the source (props, events, JSDoc)
.changeset/              pending release notes
.github/roadmap.yml      the plan; workflows/: ci.yml (check, traceability, e2e, release), roadmap.yml
journal/                 one file per day: what was done, how, learned, issues, next
scripts/                 roadmap-sync.mjs, github-release.mjs, traceability.mjs, smoke-test.mjs + smoke-app/
.claude/hooks/           SessionStart (status) and Stop (wrap-up check) hooks
```

## Commands

```bash
pnpm install
pnpm dev                       # playground, http://localhost:5173 (IWER emulator injected)
pnpm --filter docs dev         # docs site
pnpm typecheck                 # all packages
pnpm build                     # library dist + types, playground, docs
pnpm test                      # unit tests (Vitest), pnpm test:coverage for coverage
pnpm test:e2e                  # Playwright + emulated Quest 3 (E2E_COVERAGE=1: lcov in coverage-e2e/)
pnpm test:smoke                # pack, install in a fresh app, type-check, build, open (CI)
pnpm changeset                 # add release notes for a change
```

In the Claude cloud sandbox, run e2e with the preinstalled Chromium:
`cd apps/playground && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test --trace off [spec]`.
Re-run only the failing spec while fixing.

## Conventions (the non-obvious ones)

- **Units are dmm** (1 mm seen from 1 m). Sizes, fonts, gaps: dmm from the
  theme. Scene positions: metres. Smallest target: `theme.interaction.minTarget`.
- **Components** are `defineComponent` + `h()` in `.ts`, `inheritAttrs: false`,
  built on `useUikitNode` / `useChildNode` (runtime/node.ts). Take a `ui`
  prop (raw uikit props merged last). Read styles from `useXrTheme()`, never
  hard-code colours.
- **Input**: use `usePress` (runtime/press.ts). A press counts on release,
  however long; a control captures the pointer until release; a drag never
  selects. Every control must work with mouse, ray, pinch and poke.
- **Public API** = `src/index.ts`. Every prop and event gets a JSDoc comment:
  it becomes the docs API table.
- No comments that restate code; comment the why and the gotcha.

### Gotchas already paid for

- TresJS `<primitive>` is a Proxy: nested uikit nodes must `parent.add(node)`
  directly; only roots go through `<primitive>` (node.ts).
- TresJS's separate app does not see `app.provide`: we use a registry keyed by
  `appContext.app` (runtime/app-inject.ts).
- TresJS's loop uses window rAF, which stops in XR: XrScene switches to
  `renderer.setAnimationLoop` in a session. Use `useXrFrame`, not `useLoop`.
- @pmndrs/xr's emulator calls IWER `installRuntime` without `forceInstall`;
  IWER ≥ 2.3 then skips on desktop Chrome. We inject IWER ourselves.
- `@iwer/sem` / `@iwer/devui` must match the iwer major; a pnpm override
  keeps one `three`.
- A tracked hand has a grab and a touch pointer on the same fingertip; grab
  wins ties, so UI roots deny grab (`pointerEventsType: { deny: 'grab' }`).
- pmndrs `click` needs pointerup within 300 ms: buttons emit click on the
  pointerup of a captured press instead.
- The pmndrs store builds input elements only for sources arriving after the
  origin is set; XrScene re-announces input sources when the origin changes.
- uikit's bundled fonts are Latin only: we ship Inter with Cyrillic
  (src/fonts, built by scripts/build-fonts.mjs).
- uikit `zIndex` also moves hit tests: every step subtracts 1 cm from the
  pointer distance, so a fingertip "touches" a zIndex 10 element 10 cm
  early. Draw popups on top with `renderOrder` (inherited) instead;
  `zIndexOffset` alone lets later siblings' text show through.
- Sphere pointers (hand grab and fingertip touch) report a `pointerdown` on
  the void object whenever nothing is near the hand: ignore those when
  listening for "press outside" (PRESS_HUB, XrSelect).
- E2E: Playwright 1.56 has no Chromium for ubuntu 26.04, so the e2e job is
  pinned to ubuntu-24.04. Input profiles are served from e2e/assets.

## Definition of done for one task

A change is done when, in the same push:
1. typecheck and build pass; e2e covers the new behaviour (mouse + emulated
   ray, + hand poke when it is a control) and passes;
2. public API changes have JSDoc, a docs page / guide update, a playground
   entry, and a README row when it is a component;
3. user-facing changes have a changeset (`.changeset/*.md`);
4. the issue is closed by `Closes #N`, and `needs-headset` is added when only
   the headset can confirm it, with what to check;
5. the wrap-up is done (journal entry, issues synced).

## Releases

Semver, pre-1.0: breaking = minor, everything else = patch. `vue-xr-ui` and
`@vue-xr-ui/tokens` share one version. Releasing = `pnpm changeset version`,
commit `Release vX.Y.Z`, push; CI publishes to npm (needs the `NPM_TOKEN`
secret), tags and creates the GitHub Release. Details: `/release` skill.

## Claude tooling in this repo

- Skills (`.claude/skills`, also slash commands): `wrap-up` (after every
  task), `add-component`, `e2e-emulator`, `release`, `next-task`,
  `headset-check`, `docs-page`.
- Agents (`.claude/agents`): `reviewer` (self-review before push),
  `e2e-debugger` (flaky / failing emulator tests), `docs-writer`.
- GitHub from Claude: the GitHub MCP tools (issues, workflow runs, logs).
  The `gh` CLI is not authenticated in the cloud sandbox.
