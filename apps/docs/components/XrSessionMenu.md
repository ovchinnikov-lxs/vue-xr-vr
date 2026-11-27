# <code>&lt;XrSessionMenu&gt;</code>

The way out of an immersive session for tracked hands. A pinch with the palm turned toward your face (the Quest "menu" gesture, left hand by default) opens a dialog in front of you: **Leave VR?** with **Stay** and **Exit VR**.

Quest Browser is meant to end the session on a left-hand palm pinch by itself, but in practice it does not always. This makes the gesture dependable, and asks first, so a stray pinch never throws the user out.

## Usage

Put one in the scene, at the top level:

```vue
<XrScene>
  <MyScene />
  <XrSessionMenu />
</XrScene>
```

- The gesture is checked when the pinch starts (palm within 50° of the eyes) and acted on when it ends, so the same pinch cannot also press a button in the dialog.
- `hand`: `left` (default), `right` or `both`. The right palm pinch is the Quest system button; leave it to the system.
- `v-model:open` opens it from code too, e.g. from a "Menu" button (that is the way with controllers). `:gesture="false"` leaves only that.
- `title`, `hint`, `exitLabel` and `stayLabel` change its text.
- An [`<XrHandMenu>`](./XrHandMenu) on the same hand opens on the same palm pose: pass `:gesture="!handMenuOpen"`, or put one of them on the other hand.
- The default slot replaces the hint text in the dialog: settings, a recenter tip.
- It only shows during a session, and closes when the session ends.

Pair it with a visible [`<XrExitButton>`](./XrExitButton): a gesture nobody told you about is not a way out.

There is no live demo on this page: the menu only exists inside a session. Try it in the [playground](https://vue-xr-vr.vercel.app) on a Quest.

## API

<!--@include: ./api/XrSessionMenu.md-->
