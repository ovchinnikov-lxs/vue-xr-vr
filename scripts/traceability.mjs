// CI: for the commits of a push, report the ones that reference no issue
// (#N) and whether the journal was updated. Warnings + job summary only:
// it never fails the build. Usage: node scripts/traceability.mjs <before> <after>
import { execSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

const [before, after = 'HEAD'] = process.argv.slice(2)
const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
const zero = /^0+$/
const range = !before || zero.test(before) ? `${after}~1..${after}` : `${before}..${after}`

const commits = git(`log --format=%H%x09%s ${range}`).split('\n').filter(Boolean).map((l) => {
  const [sha, subject] = l.split('\t')
  const body = git(`show -s --format=%B ${sha}`)
  const files = git(`show --name-only --format= ${sha}`).split('\n').filter(Boolean)
  return { sha: sha.slice(0, 7), subject, body, files }
})
const journal = commits.some((c) => c.files.some((f) => f.startsWith('journal/')))
const untracked = commits.filter((c) => !/#\d+/.test(c.body) && !c.files.every((f) => f.startsWith('journal/')))

const lines = [`## Traceability for ${range}`, '']
lines.push(journal ? '- Journal updated in this push.' : '- ⚠️ No journal entry in this push (run the wrap-up skill).')
if (untracked.length) {
  lines.push(`- ⚠️ ${untracked.length} commit(s) reference no issue:`)
  for (const c of untracked) lines.push(`  - ${c.sha} ${c.subject}`)
} else lines.push('- Every commit references an issue.')

if (!journal) console.log('::warning title=Journal::No journal entry in this push. Run the wrap-up skill (CLAUDE.md, "After every task").')
for (const c of untracked) console.log(`::warning title=No issue::${c.sha} ${c.subject} references no issue (#N).`)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n')
console.log(lines.join('\n'))
