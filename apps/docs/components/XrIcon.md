# <code>&lt;XrIcon&gt;</code>

An icon from [Lucide](https://lucide.dev/icons) (or any SVG), drawn as a flat mesh in the panel, in the colour of the text around it. Buttons take one through their `icon` prop.

<LiveDemo demo="icon" />

## Usage

Install the framework-free `lucide` package and import only the icons you use; vue-xr-ui ships none of them.

```bash
pnpm add lucide
```

```vue
<script setup lang="ts">
import { Heart, Settings, Trash2 } from 'lucide'
</script>

<template>
  <XrIcon :icon="Settings" />
  <XrIcon :icon="Heart" :size="32" color="#f43f5e" />

  <!-- Icon + label -->
  <XrButton :icon="Heart" label="Like" />
  <!-- Icon only: a round button, as wide as it is tall -->
  <XrButton :icon="Trash2" variant="ghost" name="delete" />
</template>
```

`icon` is a Lucide icon node (a list of `[tag, attributes]`) or a whole `<svg>…</svg>` string. Outlines and filled shapes both work; gradients, images and text inside the SVG do not.

`size` is the width and height in dmm (24 by default). The icon takes the inherited text colour, so a button's icon follows the button's variant; `muted` uses the muted text colour and `color` sets one. `strokeWidth` changes the outline width of Lucide icons (2 units of their 24-unit grid).

## In buttons

`<XrButton :icon>` puts the icon before the label (`icon-end` after it), sized to the button: 20 dmm for `sm`, 24 for `md`, 28 for `lg`. Without a label or slot it becomes an icon button: round, as wide as it is tall, never smaller than the theme's `minTarget`. Give it a `name` (and an XrTooltip) so it can be found and understood.

The icon never takes the pointer itself: a press on it is a press on the button.

## Why not uikit's &lt;Svg&gt;

uikit's `Svg` fills shapes and ignores strokes, and every Lucide icon is outlines only, so it draws nothing. XrIcon turns the strokes into triangles with three's `SVGLoader.pointsToStroke`, merges everything into one mesh per icon, and fits the SVG's `viewBox` into the box.

## API

<!--@include: ./api/XrIcon.md-->
