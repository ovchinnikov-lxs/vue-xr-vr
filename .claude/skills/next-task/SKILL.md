---
name: next-task
description: Show where the project is against the roadmap and pick the next issue to work on, with a short plan. Use when asked "what's next", "где мы", "что дальше", or at the start of a session with no specific task.
---

# Next task

1. Read the definition of done and milestones in `.github/roadmap.yml`.
2. GitHub MCP `list_issues` (owner `ovchinnikov-lxs`, repo `vue-xr-vr`),
   open and closed, to compute per milestone: closed / total.
3. Report in Russian, short:
   - progress per milestone (e.g. `0.2 Components: 3/11`),
   - what is in progress or blocked (`needs-headset` issues waiting for
     Aleksandr, release waiting for `NPM_TOKEN`),
   - **the next issue**: the lowest open milestone, prefer issues that unblock
     others (packaging before docs deploy, scaffold before features).
4. Give a 3–6 step plan for it, naming the skill to use (`add-component`,
   `docs-page`, `release`...). Start working on it unless Aleksandr only
   asked where things stand.
