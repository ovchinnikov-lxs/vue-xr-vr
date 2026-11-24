# <code>&lt;XrBillboard&gt;</code>

Turns what it wraps to face the viewer every frame, while it stays where it is: labels on things in the room, name tags, markers. `axis="y"` (the default) turns it around the vertical axis only, so text stays upright; `axis="all"` also tilts it toward the eyes.

<LiveDemo demo="billboard" />

## Usage

```vue
<XrBillboard :position="[1, 1.2, -2]">
  <XrPanel :width="200">
    <XrText>Lamp</XrText>
  </XrPanel>
</XrBillboard>
```

To keep a panel in view rather than in place, use [`<XrFollow>`](./XrFollow).

## API

<!--@include: ./api/XrBillboard.md-->
