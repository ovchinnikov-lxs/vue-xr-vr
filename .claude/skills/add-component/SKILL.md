---
name: add-component
description: Add a new vue-xr-ui component end to end (component, export, playground, e2e, docs, README, changeset, issue). Use whenever a new Xr* component is built.
---

# Add a component

Example name: `XrDialog`. Do all steps in one push; this is the definition of
done from CLAUDE.md.

1. **Find the issue** (GitHub MCP `list_issues`) and read its "done when".
2. **Read a similar component first**: `XrToggle.ts` (simple control),
   `XrSlider.ts` (drag), `XrList.ts` (scroll), `XrWindow.ts` (grab/move),
   `XrKeyboard.ts` (complex). Reuse `runtime/node.ts` (`useUikitNode`,
   `useChildNode`, `slotText`), `runtime/press.ts` (`usePress`),
   `runtime/layout.ts` (flex props).
3. **Write `packages/vue-xr-ui/src/components/XrDialog.ts`**:
   - `defineComponent` + `h()`, `inheritAttrs: false`, a `ui` prop;
   - a JSDoc block on the component and on **every** prop and event;
   - styles from `useXrTheme()` (no hard-coded colours), sizes in dmm,
     targets ≥ `theme.interaction.minTarget`;
   - `v-model` as `modelValue` + `update:modelValue` when it holds a value.
4. **Export** it (and its public types) from `src/index.ts`.
5. **Playground**: add it to `apps/playground/src/scenes/HelloPanel.vue`
   with a visible label the tests can find (`name="..."` for parts).
6. **E2E**: a spec in `apps/playground/e2e/` (copy the shape of
   `controls.spec.ts`): mouse in the browser, then in the emulated Quest 3 a
   controller ray and a hand poke. Add bridge helpers to `TestHook.ts` +
   `fixtures.ts` only if needed. Run it (skill `e2e-emulator`).
7. **Docs**: skill `docs-page`: `apps/docs/components/XrDialog.md`, a demo in
   `apps/docs/demos/`, the sidebar entry in `.vitepress/config.ts`, the row
   in `components/index.md`.
8. **README**: a row in the Components table.
9. **Changeset**: `.changeset/add-xr-dialog.md`:
   ```md
   ---
   'vue-xr-ui': minor
   ---

   Add XrDialog: …
   ```
   (minor for new API before 1.0; patch for fixes).
10. `pnpm typecheck && pnpm build`, then the `reviewer` agent, then commit
    `Add XrDialog` with `Closes #N`, push to main.
11. Tell Aleksandr in Russian what to try on the Quest at
    https://vue-xr-vr.vercel.app (skill `headset-check`).
