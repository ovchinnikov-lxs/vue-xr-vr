# vue-xr-ui

## 0.2.0

### Minor Changes

- 30350af: Add XrDialog: a modal panel that opens in front of the viewer, at reading distance and facing them, over a backdrop that dims and blocks the UI behind it. `v-model:open`, `title` / `actions` slots; closes on its × button, Escape or a press on the backdrop with any input, and emits `close` with the reason. New theme colour `colors.scrim` for the backdrop.

  Custom themes written as a full `ThemeTokens` object (not through `defineTheme` / `withAccent`) must add `colors.scrim`.

### Patch Changes

- 8d7cba7: Add XrCheckbox (`v-model`, `indeterminate`, label) and XrRadioGroup (`v-model`, options as strings or `{ label, value, description, disabled }`, `direction`, `gap`). Whole rows are targets, for mouse, ray, pinch and fingertip.
- ea0224b: Add XrIcon: Lucide icon nodes (`import { Heart } from 'lucide'`) or SVG strings, drawn in the surrounding text colour; outlines are triangulated, since uikit's Svg only fills. XrButton takes an `icon` (and `iconEnd`); without a label it is a round icon button.
- 1ed0eb1: Add XrNumberInput: − / + buttons (held, they repeat) around a field, with `v-model`, `min`, `max`, `step`, `precision` and `suffix`. Typed text is parsed, clamped and rounded on Enter or blur; text that is not a number puts the last value back.
- 4ca03d3: Add XrProgress: a bar that fills to `value / max` with an optional label and percentage, an `indeterminate` bar that sweeps, and `variant="spinner"`. It animates on the XR frame loop, so it keeps moving in a session.
- 4c00f34: Add XrSelect: a dropdown with `v-model`, options as strings or `{ label, value, description, disabled }`, a `placeholder`, and `placement` (below or above the field). The list floats over the content around it (drawn on top, closer to the viewer, and first for the pointer), scrolls past `maxHeight`, and closes on a choice, a press on the field, Escape, or a press anywhere outside it, with mouse, controller ray, pinch or fingertip.
- d694463: XrDialog keeps text focus inside: while it is open, fields outside it cannot take focus (Tab and `focus()` included) and XrKeyboard stops typing into them; on close, focus goes back. A dialog opened over another opens in front of it, and Escape closes only the topmost.
- 6954a4f: Every prop and event has a JSDoc description, so editors show it on hover and every docs API table is complete.
- 952c35d: The npm page now has the full README (badges, screenshots, install guide,
  components) and links to the docs site, issues and author.
- a486591: The npm README lists every component, including XrIcon, XrCheckbox, XrRadioGroup, XrProgress, XrSelect and XrNumberInput.
- 7f7a562: Fixes after review: closing a dialog blurs its own fields, and focus goes back correctly when stacked dialogs close out of order; XrSelect closes when its field scrolls out of view or is hidden, and Escape inside a dialog closes the list only; XrIcon shares one geometry per icon and is SSR-safe; the indeterminate XrProgress moves without re-rendering; checkbox and radio targets are never narrower than `minTarget`; a held XrNumberInput button stops when the pointer slides off.
- c5fcb30: XrSelect's list is now a layout root of its own that follows the field, so a scrolling or clipping container around the select (an XrList) no longer cuts it off. It is named `<name>-popup`, and options `option-<value>`.
- 8ea5132: Meta Quest system keyboard: `<XrKeyboard>` (without `v-model`) hides itself in a session that has a system keyboard (`XRSession.isSystemKeyboardSupported`), so Quest Browser no longer shows two keyboards at once. New prop `preferSystemKeyboard` (default `true`) and `useXr().systemKeyboard`. `<XrTextField>`'s caret now follows text typed by the system keyboard instead of staying where it was.
- 38c14a3: XrTooltip: the bubble is drawn over neighbouring text (renderOrder and a small step towards the viewer instead of zIndexOffset, which let later text show through).
- Updated dependencies [8d7cba7]
- Updated dependencies [30350af]
- Updated dependencies [ea0224b]
- Updated dependencies [1ed0eb1]
- Updated dependencies [4ca03d3]
- Updated dependencies [4c00f34]
- Updated dependencies [d694463]
- Updated dependencies [6954a4f]
- Updated dependencies [952c35d]
- Updated dependencies [7f7a562]
- Updated dependencies [c5fcb30]
- Updated dependencies [8ea5132]
- Updated dependencies [38c14a3]
  - @vue-xr-ui/tokens@0.2.0

## 0.1.0

### Minor Changes

- First public release: XrScene, XrPanel, XrWindow, XrBox, XrText, XrButton,
  XrToggle, XrSlider, XrTabs, XrList, XrTooltip, XrTextField, XrKeyboard (with
  voice input), XrThemeProvider, XrEnterButton; useXr, useXrFrame, useXrTheme;
  dark and light themes with `withAccent`. Works with mouse, controller rays,
  hand pinch and fingertip poke on Quest 3 and PC VR.

### Patch Changes

- Updated dependencies
  - @vue-xr-ui/tokens@0.1.0
