#!/usr/bin/env node
// SessionStart hook: prints where the project stands, as context for Claude.
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}
const out = ['vue-xr-ui session start. Read CLAUDE.md. Plan: .github/roadmap.yml + GitHub issues/milestones.']
const entries = existsSync('journal') ? readdirSync('journal').filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort() : []
const last = entries.at(-1)
if (last) {
  const text = readFileSync(`journal/${last}`, 'utf8')
  const next = text.split(/\n## /).at(-1)?.match(/### Next\n([\s\S]*?)(\n### |\n## |$)/)?.[1]?.trim()
  out.push(`Last journal entry: journal/${last}.`)
  if (next) out.push(`Its "Next":\n${next}`)
}
const lastJournal = git('log -1 --format=%H -- journal')
const pending = lastJournal ? git(`log --oneline ${lastJournal}..HEAD`) : ''
if (pending) out.push(`Commits since the last journal entry (not wrapped up yet):\n${pending}`)
out.push('After every task: run the wrap-up skill (the Stop hook enforces it).')
console.log(out.join('\n'))
