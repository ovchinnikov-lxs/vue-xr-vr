---
'vue-xr-ui': minor
'@vue-xr-ui/tokens': minor
---

Add XrDialog: a modal panel that opens in front of the viewer, at reading distance and facing them, over a backdrop that dims and blocks the UI behind it. `v-model:open`, `title` / `actions` slots; closes on its × button, Escape or a press on the backdrop with any input, and emits `close` with the reason. New theme colour `colors.scrim` for the backdrop.

Custom themes written as a full `ThemeTokens` object (not through `defineTheme` / `withAccent`) must add `colors.scrim`.
