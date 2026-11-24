# <code>&lt;XrButton&gt;</code>

A button with `primary`, `secondary` and `ghost` variants in three sizes. One `click` for the mouse, a controller ray, a hand pinch and a fingertip poke.

<LiveDemo demo="counter" />

## Usage

```vue
<XrButton @click="count++">Increment</XrButton>
<XrButton variant="secondary" :disabled="count === 0" @click="count = 0">Reset</XrButton>
<XrButton variant="ghost" size="sm">More</XrButton>
```

## Icons

`icon` takes a Lucide icon node or an SVG string (see [XrIcon](./XrIcon)) and draws it before the label, or after it with `icon-end`. A button with an icon and no label is round:

```vue
<script setup lang="ts">
import { Share2, Trash2 } from 'lucide'
</script>

<template>
  <XrButton :icon="Share2" label="Share" />
  <XrButton :icon="Trash2" variant="ghost" name="delete" />
</template>
```

## API

<!--@include: ./api/XrButton.md-->
