# Input

Every control takes the same input, and you handle it once:

| Input | How it presses |
| --- | --- |
| Mouse | click |
| Controller | point the ray, pull the trigger |
| Hand, far | point, pinch thumb and index |
| Hand, near | poke the control with a fingertip |

All of them fire the same `click` (or `update:modelValue`) event.

## Press rules

- A press counts on **release**, however long it is held. Slow, careful
  presses (common with hands) are not lost.
- A control keeps the pointer until release, like DOM pointer capture:
  sliding off a slider while dragging keeps dragging it.
- A drag never selects: scrolling an `<XrList>` with a finger does not pick
  the item under it.
- A poke sinks the control back by `theme.interaction.pressDepth`, the visual
  feedback for touch.

## Session state

```ts
const xr = useXr()
xr.isPresenting.value // in a session?
xr.mode.value         // 'immersive-vr' | 'immersive-ar' | null
xr.supported.value    // { vr: boolean, ar: boolean }
xr.systemKeyboard.value // the session has a system keyboard (Quest Browser)
await xr.enterVR()
await xr.enterAR()
await xr.exit()
```

`<XrEnterButton mode="vr">` is a ready-made DOM button for this.
