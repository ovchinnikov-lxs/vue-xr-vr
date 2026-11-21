# Contributing to vue-xr-ui

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Report a bug or ask for a feature

Open an [issue](https://github.com/ovchinnikov-lxs/vue-xr-vr/issues/new/choose).
For bugs, say which device and browser (Quest 3 browser, PC VR, desktop),
which input (mouse, controller, hands) and how to reproduce it. A short
video from the headset helps a lot.

## Set up

```bash
pnpm install
pnpm dev                 # playground with an emulated Quest 3 on localhost
pnpm --filter docs dev   # docs site
```

Node 22, pnpm 10. To try it in a real headset: `pnpm --filter playground dev:https`
and open `https://<your-ip>:5173` in the Quest browser.

## Make a change

- Components live in `packages/vue-xr-ui/src/components`, one file each,
  written with `defineComponent` + `h()`. Read [CLAUDE.md](CLAUDE.md) for
  the conventions (units in dmm, `usePress` for input, theme tokens) and
  the known pitfalls.
- Every control must work with the mouse, a controller ray, a hand pinch
  and a fingertip poke.
- Add JSDoc to every prop and event: the docs API tables are generated from it.
- Add or update an end-to-end test in `apps/playground/e2e` and unit tests in
  `packages/*/test` where logic is pure.
- Add a changeset for anything users of the library will notice:
  `pnpm changeset` (before 1.0: `minor` for new or breaking API, `patch` for fixes).

## Check before you push

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
```

## Pull requests

One topic per PR, a clear title, and `Closes #N` for the issue it solves.
CI runs typecheck, build, unit and e2e tests.

## License

By contributing you agree that your contribution is licensed under the MIT
License.
