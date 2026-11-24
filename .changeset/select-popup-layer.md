---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

XrSelect's list is now a layout root of its own that follows the field, so a scrolling or clipping container around the select (an XrList) no longer cuts it off. It is named `<name>-popup`, and options `option-<value>`.
