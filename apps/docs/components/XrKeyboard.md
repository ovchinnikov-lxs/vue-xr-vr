# <code>&lt;XrKeyboard&gt;</code>

An on-screen keyboard with built-in and custom layouts, digits, a symbols page, shift and caps lock, and a microphone key for voice input. It types into the last focused `<XrTextField>`, or edits its own `v-model`. On Meta Quest, where the headset's own keyboard opens for a focused field, it hides itself (`preferSystemKeyboard`). See [Text and voice input](/guide/text-input).

## Usage

```vue
<XrKeyboard v-model:layout="language" :layouts="['en', 'ru', 'de']" enter-label="Send" />
```

## API

<!--@include: ./api/XrKeyboard.md-->
