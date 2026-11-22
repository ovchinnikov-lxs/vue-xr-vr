---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

Meta Quest system keyboard: `<XrKeyboard>` (without `v-model`) hides itself in a session that has a system keyboard (`XRSession.isSystemKeyboardSupported`), so Quest Browser no longer shows two keyboards at once. New prop `preferSystemKeyboard` (default `true`) and `useXr().systemKeyboard`. `<XrTextField>`'s caret now follows text typed by the system keyboard instead of staying where it was.
