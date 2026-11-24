# <code>&lt;XrCheckbox&gt;</code>

A checkbox with a label. The whole row is the target, at least the theme's `minTarget` tall, and it reacts to every input: mouse, controller ray, pinch and fingertip.

<LiveDemo demo="checkbox-radio" />

## Usage

```vue
<script setup lang="ts">
const agree = ref(false)
</script>

<template>
  <XrCheckbox v-model="agree">I agree to the terms</XrCheckbox>
  <XrCheckbox v-model="agree" label="Same, with a prop" disabled />
</template>
```

A press flips `modelValue` and emits `update:modelValue` and `change`.

## Indeterminate

`indeterminate` draws a dash instead of the check mark, for a parent of several checkboxes that are only partly checked. A press on it emits `true`. The component never clears `indeterminate` by itself: compute it from the children, as in the demo above.

```vue
<XrCheckbox :model-value="all" :indeterminate="some && !all" @update:model-value="setAll">All rooms</XrCheckbox>
```

For one choice out of several, use [XrRadioGroup](./XrRadioGroup); for an on/off setting that applies at once, [XrToggle](./XrToggle).

## API

<!--@include: ./api/XrCheckbox.md-->
