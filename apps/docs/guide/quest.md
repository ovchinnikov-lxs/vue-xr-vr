# Testing on a Quest

WebXR needs HTTPS everywhere except `localhost`.

## A deployed build

Deploy anywhere with HTTPS (Vercel, Netlify, GitHub Pages) and open the URL
in the Quest browser. The project's playground is deployed on every push to
`main`: <https://vue-xr-vr.vercel.app>.

## Your dev server

Serve Vite over HTTPS on your LAN with a self-signed certificate
(`@vitejs/plugin-basic-ssl`):

```bash
pnpm --filter playground dev:https
```

Open `https://<your-computer-ip>:5173` in the Quest browser, accept the
certificate warning, press **Enter VR**.

## What to check in the headset

Things an emulator cannot tell you:

- text is crisp and readable at the panel's distance,
- targets are easy to poke with a fingertip, not only with a ray,
- frame rate stays smooth (72 Hz or more) while scrolling and dragging,
- passthrough (Enter AR) shows the room and panels stay put.

## Why text looks softer than on a monitor

A Quest 3 shows about 25 pixels per degree of view. A laptop screen at
arm's length shows about 60 to 100, so the same letters get two to four
times fewer pixels in the headset. That part is physics, not a bug: make
text bigger rather than expect monitor sharpness. The default theme's body
text is 18 dmm: at its 1 m reading distance an em is about 1 degree, some
25 headset pixels. Anything smaller than the theme's `caption` (14 dmm) is
hard to read.

What *is* in our hands, and on by default in `<XrScene>`:

- **native resolution**: the browser's default framebuffer is smaller than
  the display; we ask for the device's native scale,
- **no fixed foveation**: three.js defaults to maximum foveation, which
  renders the edges of each lens at lower resolution,
- **MSAA** (TresCanvas `antialias`, on by default),
- text as signed-distance-field glyphs, which stay sharp at any distance.

On PC VR (Quest Link, Windows) the image is also compressed and streamed
over the cable or Wi-Fi, which adds its own blur: raise the Link
resolution and bitrate in the Meta Quest app (Devices, Graphics
Preferences) for a sharper picture.

## Getting out of a session

Quest Browser ends the session on the left-hand palm pinch (the menu
gesture) and on the controller's Meta button, but with hands this has
proved unreliable. Give users a way out you control:
[`<XrExitButton>`](/components/XrExitButton) on the main window, and
[`<XrSessionMenu>`](/components/XrSessionMenu), which turns the left palm
pinch into a "Leave VR?" dialog.
