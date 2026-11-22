# Text and voice input

`<XrTextField>` is a single-line input with a real caret (tap where to type).
On a desktop, the physical keyboard types into it. In the headset, pair it
with `<XrKeyboard>`: the keyboard types into the last focused field.

```vue
<XrTextField v-model="message" placeholder="Message" @submit="send" />
<XrKeyboard :layouts="['en', 'ru']" enter-label="Send" />
```

## System keyboard (Meta Quest)

Quest Browser has its own keyboard in immersive sessions: it opens by itself
when a text field is focused (`XRSession.isSystemKeyboardSupported`). There,
`<XrKeyboard>` without `v-model` hides itself, so the user never sees two
keyboards, and the field's caret follows what the system keyboard types.
`useXr().systemKeyboard` tells you when this is the case, e.g. to drop the
window the keyboard sits in:

```vue
<XrWindow v-if="!xr.systemKeyboard.value">
  <XrKeyboard />
</XrWindow>
```

Pass `:prefer-system-keyboard="false"` to keep `<XrKeyboard>` anyway. A
keyboard with `v-model` always shows: it is the only way to edit its string.

## Layouts

Built in: `en` `ru` `uk` `de` `fr` `es`. Add your own:

```ts
import type { XrKeyboardLayout } from 'vue-xr-ui'

// One string per row, one character per key.
const dvorak: XrKeyboardLayout = {
  label: 'DV',
  name: 'Dvorak',
  locale: 'en-US',
  rows: ['pyfgcrl', 'aoeuidhtns', 'qjkxbmwvz'],
}
```

```vue
<XrKeyboard :layouts="['en', dvorak]" />
```

`v-model:layout` is the index of the active layout. Shift (double tap for
caps lock) and a held Backspace that repeats work as on a phone.

## Voice

The keyboard has a microphone key that dictates in the active layout's
language.

- `:voice="true"` (default): the browser's Web Speech API; the key is hidden
  where there is none.
- `:voice="recordingRecognizer(transcribe)"`: records the microphone and
  sends the audio to your own speech to text (a Whisper endpoint, a cloud
  service).
- `:voice="false"`: no microphone key.

## Fonts

Text renders in Inter with Latin (including French, German, Spanish letters)
and Cyrillic. Each weight is loaded on first use, about 250 KB.
