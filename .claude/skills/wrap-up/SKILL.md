---
name: wrap-up
description: Mandatory after every task and at the end of every session — sync issues, milestones and roadmap.yml with what was actually done, and write the journal entry (what, how, what we learned, next). The Stop hook blocks stopping until it is done.
---

# Wrap-up (after every task)

Aleksandr's rule: after every action there is an analysis of what was done
and how, and the plan is brought up to date. No exceptions for "small"
changes; a pure question with no work needs no wrap-up.

## 1. What happened

- `git log --oneline $(git log -1 --format=%H -- journal)..HEAD` — commits
  since the last journal entry (the Stop hook lists them too).
- Uncommitted work? Commit and push it first, or write down why it stays.
- CI on main for those commits (GitHub MCP `actions_list`); a red run is a
  finding, not something to leave out.

## 2. Sync the plan (GitHub is the truth for issues)

With the GitHub MCP tools (owner `ovchinnikov-lxs`, repo `vue-xr-vr`):

- **Close** issues the work finished (if a commit had no `Closes #N`, close
  them with `issue_write` `state: closed`, `state_reason: completed`) and
  leave a short comment: what was done, the commit(s).
- **Update** issues that moved but are not done: comment with progress, fix
  the title / body / milestone if the plan changed.
- **Create** issues for anything discovered: bugs, follow-ups, debts, ideas.
  Add them to `.github/roadmap.yml` too (with `milestone`, `labels`, a
  "done when" body) so the plan file stays complete; the Roadmap workflow
  matches by title and will not duplicate.
- `needs-headset`: add it where only the Quest can confirm; remove it when
  Aleksandr confirmed.
- If the definition of done or milestones changed, edit roadmap.yml.

## 3. Journal entry

Append to `journal/YYYY-MM-DD.md` (today, UTC; create the file with a
`# YYYY-MM-DD` title if missing). One section per task:

```md
## <task in a few words> (<commits, e.g. 14d942c..132df22>)

### Done
- What changed for the user of the library / for us. Link issues: #27.

### How
- The approach and the decisions taken, with the why. Alternatives rejected.

### Learned
- Gotchas, surprises, things that took longer than they should. If one is
  durable, also put it in CLAUDE.md "Gotchas".

### Issues
- Closed: #27. Updated: #13 (waiting for NPM_TOKEN). Created: #50.

### Next
- The next 1-3 concrete steps (issue numbers), and what waits on Aleksandr.
```

Keep it short and factual: it is the project's memory between sessions
(the SessionStart hook shows the last "Next").

## 4. Commit and report

- Commit `Journal: <task>` (journal + roadmap.yml), push to main.
- Tell Aleksandr in Russian, 3-5 lines: what is done, what changed in the
  plan (closed / new issues), what he needs to check or decide.
