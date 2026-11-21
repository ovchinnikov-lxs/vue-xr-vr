# <code>&lt;XrBox&gt;</code>

A transparent flex container, the `<div>` of vue-xr-ui.

## Usage

```vue
<XrBox direction="row" justify="space-between" align="center" :gap="3">
  <XrText variant="label">Volume</XrText>
  <XrSlider v-model="volume" :ui="{ flexGrow: 1 }" />
</XrBox>
```

## API

<!--@include: ./api/XrBox.md-->
