---
'vue-xr-ui': minor
---

Passthrough polish: in an `immersive-ar` session `<XrScene>` clears to transparent and hides `scene.background` so the room shows through (`:passthrough="false"` to keep them), and restores both when the session ends. `<XrScene>` emits `recenter` when the user recentres the view. `<XrEnterButton mode="auto">` starts passthrough where the device has it, VR elsewhere. The emulator takes the furnished IWER rooms (`kitchen`, `bedroom`...) as `room`.
