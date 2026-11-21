# vue-xr-ui

Vue components for VR and mixed-reality interfaces on the web. Write spatial
UI the way you write a Vue app: components, props, events, design tokens. It
runs in the Meta Quest 3 browser, in PC VR through a desktop browser, and on a
regular screen with a mouse.

```bash
pnpm add vue-xr-ui @tresjs/core three
```

```vue
<TresCanvas window-size>
  <XrScene>
    <XrPanel :position="[0, 1.45, -1]" :width="440">
      <XrText variant="headline">Hello, XR</XrText>
      <XrButton @click="count++">Clicked {{ count }} times</XrButton>
    </XrPanel>
  </XrScene>
</TresCanvas>
```

One `click` event works for every input: mouse, controller ray, hand pinch,
and poking the button with a fingertip.

- Docs: https://vue-xr-ui-docs.vercel.app
- Playground (open it in the Quest browser): https://vue-xr-vr.vercel.app
- Docs, source and roadmap: https://github.com/ovchinnikov-lxs/vue-xr-vr

MIT
