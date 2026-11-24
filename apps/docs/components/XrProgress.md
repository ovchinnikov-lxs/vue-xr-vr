# <code>&lt;XrProgress&gt;</code>

Progress: a bar that fills up to `value / max`, a bar that sweeps when the amount is unknown, or a spinner. It animates on the XR frame loop, so it keeps moving inside the headset.

<LiveDemo demo="progress" />

## Usage

```vue
<template>
  <!-- Determinate: 0..max, clamped -->
  <XrProgress :value="downloaded" :max="total" label="Downloading" show-value />

  <!-- Unknown length -->
  <XrProgress indeterminate label="Connecting" />
  <XrProgress variant="spinner" label="Loading rooms…" />
  <XrProgress variant="spinner" :size="24" />
</template>
```

- `value` and `max` (100 by default): the bar fills `value / max` of the track. Values outside `0..max` are clamped.
- `label` goes above a bar and next to a spinner; `show-value` adds the percentage at the end of the label row.
- `indeterminate` sweeps a segment across the track instead of filling it; a spinner is always indeterminate.
- `size`: a spinner's diameter, or a bar's thickness, in dmm (32 and 8 by default).

A bar stretches to the width of its container; a spinner is as wide as it is tall, plus its label.

Nothing re-renders per frame while a bar is determinate: only the indeterminate bar and the spinner animate (the spinner in eight steps a second turn).

## API

<!--@include: ./api/XrProgress.md-->
