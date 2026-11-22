# <code>&lt;XrTextField&gt;</code>

A single-line text input with a real caret: tap where to type. The physical keyboard types into it on a desktop, `<XrKeyboard>` or the headset's system keyboard (Meta Quest) in the headset. Enter emits `submit`. See [Text and voice input](/guide/text-input).

## Usage

```vue
<XrTextField v-model="message" placeholder="Type here…" @submit="send" />
<XrTextField v-model="password" type="password" />
```

## API

<!--@include: ./api/XrTextField.md-->
