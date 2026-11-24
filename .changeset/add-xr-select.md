---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

Add XrSelect: a dropdown with `v-model`, options as strings or `{ label, value, description, disabled }`, a `placeholder`, and `placement` (below or above the field). The list floats over the content around it (drawn on top, closer to the viewer, and first for the pointer), scrolls past `maxHeight`, and closes on a choice, a press on the field, Escape, or a press anywhere outside it, with mouse, controller ray, pinch or fingertip.
