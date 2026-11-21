# <code>&lt;XrButton&gt;</code>

A button with `primary`, `secondary` and `ghost` variants in three sizes. One `click` for the mouse, a controller ray, a hand pinch and a fingertip poke.

<LiveDemo demo="counter" />

## Usage

```vue
<XrButton @click="count++">Increment</XrButton>
<XrButton variant="secondary" :disabled="count === 0" @click="count = 0">Reset</XrButton>
<XrButton variant="ghost" size="sm">More</XrButton>
```

## API

<!--@include: ./api/XrButton.md-->
