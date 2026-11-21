#!/usr/bin/env node
// Stop hook: Claude may not end its turn while work since the last journal
// entry is not wrapped up (issues synced, retro written). See the wrap-up
// skill. Reads the hook payload on stdin; exit 2 + stderr = keep working.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {}
// Already reminded once in this stop sequence: let it stop, never loop.
if (input.stop_hook_active) process.exit(0)

const git = (cmd, trim = true) => {
  try {
    const out = execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return trim ? out.trim() : out
  } catch {
    return ''
  }
}
const isJournal = (path) => path.startsWith('journal/')

// Commits after the last one that touched journal/.
const lastJournal = git('log -1 --format=%H -- journal')
const range = lastJournal ? `${lastJournal}..HEAD` : 'HEAD'
const commits = git(`log --format=%h ${range}`).split('\n').filter(Boolean)
const unwrapped = commits.filter((sha) =>
  git(`show --name-only --format= ${sha}`)
    .split('\n')
    .filter(Boolean)
    .some((p) => !isJournal(p)),
)
// Uncommitted work outside the journal.
const dirty = git('status --porcelain', false)
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3))
  .filter((p) => !isJournal(p))

if (unwrapped.length === 0 && dirty.length === 0) process.exit(0)

const lines = ['Wrap-up is required before stopping (CLAUDE.md, "After every task").']
if (dirty.length) lines.push(`Uncommitted changes: ${dirty.slice(0, 8).join(', ')}${dirty.length > 8 ? ', …' : ''}. Commit and push them, or say why not.`)
if (unwrapped.length) lines.push(`Commits not yet in the journal: ${unwrapped.slice(0, 10).join(' ')}.`)
lines.push('Run the wrap-up skill: close/update/create issues, sync .github/roadmap.yml, write journal/<date>.md, commit, push.')
lines.push('If this turn was only a question with no work, say so in one line and stop.')
process.stderr.write(lines.join('\n') + '\n')
process.exit(2)
