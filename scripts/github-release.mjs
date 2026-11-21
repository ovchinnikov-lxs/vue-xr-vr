// Tags and creates a GitHub Release for the current version once it is on
// npm. The fixed group (vue-xr-ui + @vue-xr-ui/tokens) shares a version, so
// one release per version is made, tagged v<version>, with that version's
// section of the vue-xr-ui CHANGELOG as notes.
//
// Whether a version is released is decided by npm, not by local tags:
// `changeset publish` creates its tags as annotated tags, which fail without
// a git identity and only print a warning, so a run could publish to npm and
// leave no tag behind. This script repairs that on the next run.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
const ok = (cmd, args) => {
  try {
    sh(cmd, args)
    return true
  } catch {
    return false
  }
}

const version = JSON.parse(readFileSync('packages/vue-xr-ui/package.json', 'utf8')).version
if (!ok('npm', ['view', `vue-xr-ui@${version}`, 'version'])) {
  console.log(`vue-xr-ui@${version} is not on npm: nothing to release.`)
  process.exit(0)
}

// Tag the commit that set this version, not whatever HEAD is now.
const commit = sh('git', ['log', '-1', '--format=%H', '--', 'packages/vue-xr-ui/package.json'])
const remoteTags = sh('git', ['ls-remote', '--tags', 'origin'])
const tag = `v${version}`
for (const name of [`vue-xr-ui@${version}`, `@vue-xr-ui/tokens@${version}`, tag]) {
  if (remoteTags.includes(`refs/tags/${name}`)) continue
  if (!ok('git', ['rev-parse', '-q', '--verify', `refs/tags/${name}`])) sh('git', ['tag', name, commit])
  sh('git', ['push', 'origin', `refs/tags/${name}`])
  console.log(`Pushed tag ${name}.`)
}

if (ok('gh', ['release', 'view', tag])) {
  console.log(`Release ${tag} exists.`)
  process.exit(0)
}

let notes = `Release ${version}`
const changelog = 'packages/vue-xr-ui/CHANGELOG.md'
if (existsSync(changelog)) {
  const text = readFileSync(changelog, 'utf8')
  const start = text.indexOf(`## ${version}`)
  if (start >= 0) {
    const rest = text.slice(start + 1)
    const end = rest.search(/\n## \d/)
    notes = rest.slice(rest.indexOf('\n') + 1, end < 0 ? undefined : end).trim()
  }
}
notes += `\n\n\`\`\`bash\npnpm add vue-xr-ui@${version}\n\`\`\``
sh('gh', ['release', 'create', tag, '--title', tag, '--notes', notes, '--verify-tag'])
console.log(`Created release ${tag}.`)
