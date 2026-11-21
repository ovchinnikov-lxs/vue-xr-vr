# <code>&lt;XrTabs&gt;</code>

Segmented tabs that switch a value. Show the matching content with `v-if`.

<LiveDemo demo="tabs" />

## Usage

```vue
<XrTabs v-model="tab" :tabs="['Controls', 'List', 'Theme']" block />
<XrBox v-if="tab === 'Controls'">…</XrBox>
```

## API

<!--@include: ./api/XrTabs.md-->
