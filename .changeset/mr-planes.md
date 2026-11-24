---
'vue-xr-ui': minor
---

Snap to walls and tables: `<XrWindow snap>` sticks to real surfaces from the room setup while carried (flat on a wall facing into the room, standing on a table facing you), with `snapDistance`, a `snap` event and a `place` event on release. `useXrPlanes()` returns the detected planes (label, orientation, world matrix, centre, normal, outline) and `<XrPlanes>` draws them.
