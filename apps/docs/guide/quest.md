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
