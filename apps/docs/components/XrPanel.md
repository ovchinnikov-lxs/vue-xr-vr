# <code>&lt;XrPanel&gt;</code>

A floating surface and a flex container with the theme's background. With a `position` it is a root in the scene; inside another component it is a card.

<LiveDemo demo="panel" />

## Usage

```vue
<XrPanel :position="[0, 1.45, -1]" :width="440" :gap="4">
  <XrText variant="title">Today</XrText>
  <XrPanel variant="sunken" :padding="4">
    <XrText muted>Nested panels are cards.</XrText>
  </XrPanel>
</XrPanel>
```

## API

<!--@include: ./api/XrPanel.md-->
