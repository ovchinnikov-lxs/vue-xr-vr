---
'vue-xr-ui': patch
---

XrScene renders sessions at the device's native resolution with no fixed foveation by default (`frameBufferScaling: 'high'`, `foveation: 0`), for sharper text in the headset. Override both through `options`.
