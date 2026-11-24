---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

Add XrNumberInput: − / + buttons (held, they repeat) around a field, with `v-model`, `min`, `max`, `step`, `precision` and `suffix`. Typed text is parsed, clamped and rounded on Enter or blur; text that is not a number puts the last value back.
