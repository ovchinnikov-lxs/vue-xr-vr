# Changesets

Every change a user of the library would notice gets a changeset: a small
markdown file saying which packages change, how (patch / minor / major) and
what to write in the CHANGELOG. `pnpm changeset` creates one interactively;
Claude writes them by hand (see `.claude/skills/release/SKILL.md`).

`vue-xr-ui` and `@vue-xr-ui/tokens` are released together with one version.
Before 1.0, a breaking change is a **minor** bump, everything else a patch.
