---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

Fixes after review: closing a dialog blurs its own fields, and focus goes back correctly when stacked dialogs close out of order; XrSelect closes when its field scrolls out of view or is hidden, and Escape inside a dialog closes the list only; XrIcon shares one geometry per icon and is SSR-safe; the indeterminate XrProgress moves without re-rendering; checkbox and radio targets are never narrower than `minTarget`; a held XrNumberInput button stops when the pointer slides off.
