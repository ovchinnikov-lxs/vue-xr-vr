# <code>&lt;XrEnterButton&gt;</code>

A regular DOM button that starts or ends an XR session. Put it next to `<TresCanvas>`, not inside it. It renders a plain `<button class="xr-enter-button">` with a `data-state` of `ready`, `presenting` or `unavailable`, so styling is up to you. `data-mode` says which session it starts (`vr` or `ar`).

## Usage

```vue
<XrEnterButton mode="vr" />
<!-- passthrough on a Quest 3 / Quest Pro, VR elsewhere -->
<XrEnterButton mode="auto" />
<XrEnterButton mode="ar" v-slot="{ label }">{{ label }} (passthrough)</XrEnterButton>
```

## API

<!--@include: ./api/XrEnterButton.md-->
