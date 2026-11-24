// Tags and creates a GitHub Release for the current version once it is on
// npm. The fixed group (vue-xr-ui + @vue-xr-ui/tokens) shares a version, so
// one release per version is made, tagged v<version>, with that version's
// section of the vue-xr-ui CHANGELOG as notes.
//
// Whether a version is released is decided by npm, not by local tags:
// `changeset publish` creates its tags as annotated tags, which fail without
// a git identity, and pushing them with GITHUB_TOKEN can be refused, so a run
// could publish to npm and leave no tag behind. This script repairs that on
// the next run.
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
// Right after `changeset publish` the registry can still answer 404 for the
// new version (0.2.0 did, 2 s after publishing), so ask for up to a minute.
const onNpm = () => ok('npm', ['view', `vue-xr-ui@${version}`, 'version'])
let published = onNpm()
for (let i = 0; !published && process.env.CI && i < 6; i++) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_000)
  published = onNpm()
}
if (!published) {
  console.log(`vue-xr-ui@${version} is not on npm: nothing to release.`)
  process.exit(0)
}

// Tag the commit that set this version, not whatever HEAD is now. The tag is
// created by the Releases API (--target): a git push of a tag with
// GITHUB_TOKEN is refused when the tagged commit touches .github/workflows.
const commit = sh('git', ['log', '-1', '--format=%H', '--', 'packages/vue-xr-ui/package.json'])
const tag = `v${version}`

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
sh('gh', ['release', 'create', tag, '--title', tag, '--notes', notes, '--target', commit])
console.log(`Created release ${tag}.`)
