# <code>&lt;XrSelect&gt;</code>

A dropdown: a field that shows the chosen option and, when pressed, opens a list of options floating over the content around it. It opens and chooses with every input: mouse, controller ray, pinch and fingertip.

<LiveDemo demo="select" />

## Usage

```vue
<script setup lang="ts">
const quality = ref('High')
const voice = ref<string>()
</script>

<template>
  <XrSelect v-model="quality" :options="['Low', 'Medium', 'High']" />

  <XrSelect
    v-model="voice"
    placeholder="Pick a voice"
    :options="[
      { label: 'Nova', value: 'nova', description: 'Warm and calm' },
      { label: 'Echo', value: 'echo' },
      { label: 'Ember', value: 'ember', description: 'Coming soon', disabled: true },
    ]"
  />
</template>
```

Options are strings (the label is the value) or `XrSelectOption` objects: `{ label, value, description?, disabled? }`, where `value` is a string or a number. Until `modelValue` matches an option, the field shows `placeholder`, muted.

Choosing an option emits `update:modelValue`, and `change` when the value is a new one.

## Opening and closing

A press on the field opens the list, below it, or above it with `placement="top"`. The list is drawn over whatever is around it, a little closer to the viewer, and takes the pointer first where it overlaps other UI: a press on an option never reaches the control behind it. It scrolls when it is taller than `maxHeight` (dmm).

It closes, emitting `close`, on:

- a choice;
- another press on the field;
- **Escape** on a desktop keyboard;
- a press **anywhere outside it**: on other vue-xr-ui UI or on empty space, with any input. Unlike a dialog's backdrop, a press outside that lands on another control also presses that control.

Presses on your own three.js objects (a mesh with `@click`) are not seen and leave it open. A hand's pinch is a press of its ray, wherever the ray points; a fingertip closes it when it pokes other UI.

The list is a layout root of its own that follows the field every frame (it is named `<name>-popup` after the select), so a container that clips the select (an `XrList`, anything with `overflow: hidden` or `scroll`) does not clip the list: a select in a row of a scrolling settings list opens fully. Options are named `option-<value>`.

`open()` and `close()` are exposed on the component's ref.

## API

<!--@include: ./api/XrSelect.md-->
