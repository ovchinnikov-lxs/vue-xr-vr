---
name: release
description: Cut a release of vue-xr-ui and @vue-xr-ui/tokens (changesets → version bump → CI publishes to npm, tags, GitHub Release). Also how to write a changeset.
---

# Release

## Changesets, on every user-facing change

Write `.changeset/<short-kebab-name>.md` in the same commit as the change:

```md
---
'vue-xr-ui': patch
---

XrSlider: a poke at the very end of the track now reaches `max`.
```

- Before 1.0: breaking change or new API → `minor`; fix → `patch`.
  After 1.0: normal semver.
- `vue-xr-ui` and `@vue-xr-ui/tokens` are a fixed group: one version.
- Write for users of the library: what changed for them, not how.
- Not for: playground, docs, tests, CI only changes.

## Cutting a release

1. `git pull`, make sure CI on main is green (GitHub MCP `actions_list`).
2. `pnpm changeset status` to see what goes out; pick the moment with
   Aleksandr if it is a minor.
3. `pnpm changeset version` → bumps package.json versions, writes
   `packages/*/CHANGELOG.md`, deletes the changesets.
4. `pnpm install` (lockfile), `pnpm build`, check `CHANGELOG.md` reads well.
5. Commit `Release vX.Y.Z`, push to main.
6. CI (`release` job in ci.yml, after check and e2e) runs
   `changeset publish`: publishes versions that are not on npm, pushes tags
   `vue-xr-ui@X.Y.Z`, then `scripts/github-release.mjs` adds `vX.Y.Z` and a
   GitHub Release with the CHANGELOG section.
7. Verify: job log, `npm view vue-xr-ui version`, the Release page.
   Tell Aleksandr in Russian with links.

## Needs from Aleksandr (once)

- npm organization `vue-xr-ui` (for the `@vue-xr-ui` scope).
- Repository secret `NPM_TOKEN`: npm granular token, read+write on the
  packages, "bypass 2FA" on. Without it the release job only warns.
- Later: trusted publishing (OIDC) on npmjs.com, then delete the token.

## Check the package before releasing something big

```bash
cd packages/vue-xr-ui && pnpm pack --pack-destination /tmp
tar tzf /tmp/vue-xr-ui-*.tgz   # dist/, README, LICENSE, package.json with dist exports
```
