---
name: docs-page
description: Write or update a docs site page in apps/docs (VitePress) for a component or a guide, with a live 3D demo and the generated API table.
---

# Docs page

The docs site is part of the end result. Every public component has a page.

## Component page: `apps/docs/components/XrName.md`

```md
# <code>&lt;XrName&gt;</code>

One or two sentences: what it is, which inputs work with it.

<LiveDemo demo="xr-name" />

## Usage

```vue
<XrName v-model="value" />
```

## API

<!--@include: ./api/XrName.md-->
```

- The API table is generated from the component source by
  `apps/docs/scripts/api.mjs` (runs before dev and build). Missing a
  description? Add JSDoc to the prop in the component, not to the page.
- Demo: `apps/docs/demos/xr-name.vue`, one root `<XrPanel :position="[0, 1.45, -1]" :width="420">`
  with the component in a realistic small use. One `<LiveDemo>` per page.
- Add the page to the sidebar groups in `.vitepress/config.ts` and a row in
  `components/index.md`.

## Guides: `apps/docs/guide/*.md`

Task-oriented ("Theming", "Testing on a Quest"). Code first, then the
non-obvious parts. Add to the `/guide/` sidebar.

## Check

```bash
pnpm --filter docs build      # must pass (dead links fail the build)
pnpm --filter docs dev        # look at it
```
