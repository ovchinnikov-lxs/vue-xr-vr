---
'vue-xr-ui': patch
'@vue-xr-ui/tokens': patch
---

XrDialog keeps text focus inside: while it is open, fields outside it cannot take focus (Tab and `focus()` included) and XrKeyboard stops typing into them; on close, focus goes back. A dialog opened over another opens in front of it, and Escape closes only the topmost.
