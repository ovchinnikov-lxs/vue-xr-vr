---
'vue-xr-ui': minor
---

Anchors that persist: `<XrWindow anchor="name">` remembers where the user put it down, across sessions and reloads; `<XrAnchor id>` keeps any content at a spot in the room (`place()`, `forget()`, slot props and ref); `useXrAnchor(id)` for code. On a Quest they are persistent WebXR anchors; elsewhere the pose in the floor space is saved in localStorage.
