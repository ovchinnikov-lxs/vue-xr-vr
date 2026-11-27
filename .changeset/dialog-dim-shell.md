---
'vue-xr-ui': patch
---

XrDialog's backdrop dims the whole scene (a shell around the head, drawn over everything but the dialog) instead of a flat plane you could walk through. Popups and tooltips inside a dialog draw over it. A fingertip no longer presses the backdrop; rays and pinches still close the dialog on it.
