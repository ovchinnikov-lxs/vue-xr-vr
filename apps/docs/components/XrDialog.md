# <code>&lt;XrDialog&gt;</code>

A modal panel for a question that needs an answer now: confirm a delete, name a file, accept a permission. It opens in front of the viewer wherever they look, at reading distance and facing them, over a backdrop that dims and blocks the UI behind it.

<LiveDemo demo="dialog" />

## Usage

```vue
<script setup lang="ts">
const open = ref(false)
</script>

<template>
  <XrButton @click="open = true">Delete…</XrButton>

  <XrDialog v-model:open="open" title="Delete playlist?">
    <XrText muted>This cannot be undone.</XrText>
    <template #actions>
      <XrButton variant="secondary" @click="open = false">Cancel</XrButton>
      <XrButton @click="remove">Delete</XrButton>
    </template>
  </XrDialog>
</template>
```

Put `<XrDialog>` at the top level of the scene, not inside another panel: it places itself.

## Closing

The dialog closes itself, setting `open` to `false` and emitting `close` with the reason, on:

- the **×** button in the header (`button`), hidden with `:closable="false"`;
- **Escape** on a desktop keyboard (`escape`), off with `:close-on-escape="false"`;
- a press on the **backdrop** (`backdrop`), with any input: mouse, controller ray, pinch or fingertip. Off with `:close-on-backdrop="false"`.

Your own buttons close it by setting `open` to `false`; that emits no `close`.

## Placement and the backdrop

When `open` turns `true`, the dialog is placed in front of the viewer's head, level with their eyes and turned to face them. In a session that is the headset; on a desktop it is the camera. Pass `position` to open it at a fixed place instead.

It opens a little closer than other UI (0.75 × the theme's `viewingDistance`, scaled so it looks the same size), so the backdrop, a plane just behind the dialog, covers the panels at reading distance and catches the pointer before they do. It does not block objects between the viewer and the dialog. `:backdrop="false"` turns the backdrop off; the dialog is then not modal.

The backdrop colour is the theme's `colors.scrim`.

## API

<!--@include: ./api/XrDialog.md-->
