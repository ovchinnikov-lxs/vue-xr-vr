# <code>&lt;XrNumberInput&gt;</code>

A number with − and + buttons and a field to type it in. The buttons work with every input (mouse, controller ray, pinch, fingertip) and keep stepping while held.

<LiveDemo demo="number-input" />

## Usage

```vue
<script setup lang="ts">
const guests = ref(2)
const temperature = ref(21.5)
</script>

<template>
  <XrNumberInput v-model="guests" :min="1" :max="12" />
  <XrNumberInput v-model="temperature" :min="16" :max="28" :step="0.5" suffix="°C" />
</template>
```

- `min` / `max` bound the value; − is disabled at `min` and + at `max`.
- `step` is what − and + add; `precision` (decimals kept) defaults to the decimals of `step`, so `step="0.5"` keeps one.
- `suffix` is a muted unit after the field.
- Without a value (`undefined`), the field shows `placeholder` and the first − or + sets `min` (or 0).

## Stepping and typing

− and + step once on release, like every vue-xr-ui control. Held for about half a second, they step again ten times a second until released or a limit is reached.

The field is an [XrTextField](./XrTextField): type with an [XrKeyboard](./XrKeyboard), a physical keyboard, or the Quest's system keyboard. The typed text becomes the value on **Enter** or when the field loses focus: parsed (a comma works as the decimal point), clamped to `min`..`max` and rounded to `precision`. Text that is not a number puts the previous value back.

`update:modelValue` and `change` carry a value that is always inside the limits.

## API

<!--@include: ./api/XrNumberInput.md-->
