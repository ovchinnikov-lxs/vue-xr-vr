---
'vue-xr-ui': patch
---

XrTextField with the Quest system keyboard: a press focuses the field on its release (inside the session's `select` event), and closing the keyboard drops the field's focus so the next tap opens it again. Before, the keyboard opened under a held trigger, showed no caret and typed nothing.
