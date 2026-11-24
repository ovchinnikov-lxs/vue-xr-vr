# <code>&lt;XrRadioGroup&gt;</code>

A set of options of which one is chosen, all shown at once. Every row is a target at least the theme's `minTarget` tall, for every input: mouse, controller ray, pinch and fingertip.

<LiveDemo demo="checkbox-radio" />

## Usage

```vue
<script setup lang="ts">
const size = ref('Medium')
const plan = ref<string>()
</script>

<template>
  <XrRadioGroup v-model="size" direction="row" :options="['Small', 'Medium', 'Large']" />

  <XrRadioGroup
    v-model="plan"
    :options="[
      { label: 'Free', value: 'free', description: 'One room' },
      { label: 'Home', value: 'home', description: 'Every room' },
      { label: 'Office', value: 'office', disabled: true },
    ]"
  />
</template>
```

Options are strings (the label is the value) or `XrRadioOption` objects: `{ label, value, description?, disabled? }`, the same shape as [XrSelect](./XrSelect)'s. Choosing another option emits `update:modelValue` and `change`; pressing the chosen one does nothing. Until `modelValue` matches an option, none is chosen.

`direction="row"` puts them side by side (wrapping when they do not fit), `gap` spaces them, `disabled` greys them all out.

With more than five or six options, or little room, use XrSelect.

## API

<!--@include: ./api/XrRadioGroup.md-->
