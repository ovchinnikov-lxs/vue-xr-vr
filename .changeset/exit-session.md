---
'vue-xr-ui': patch
---

New `XrExitButton` (an in-scene button that ends the session, shown only in one) and `XrSessionMenu` (a left palm pinch opens "Leave VR?" with Stay / Exit), so users can leave a session with hands alone. `useXr().exit()` now waits for the current frame, so it can be called from a button in the scene.
