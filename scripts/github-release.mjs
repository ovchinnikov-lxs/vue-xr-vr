// Creates a GitHub Release for each package version tag that has none yet,
// with that version's section of the package CHANGELOG as notes. The fixed
// group (vue-xr-ui + @vue-xr-ui/tokens) shares a version, so one release per
// version is made, tagged v<version>, from the vue-xr-ui changelog.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
const pkg = JSON.parse(readFileSync('packages/vue-xr-ui/package.json', 'utf8'))
const version = pkg.version

// changeset publish tags as vue-xr-ui@0.1.0; also publish the short v0.1.0 tag.
const tags = sh('git', ['tag', '--list']).split('\n')
if (!tags.includes(`vue-xr-ui@${version}`)) {
  console.log(`No tag vue-xr-ui@${version}: this version is not published yet.`)
  process.exit(0)
}
const tag = `v${version}`
try {
  sh('gh', ['release', 'view', tag])
  console.log(`Release ${tag} exists.`)
  process.exit(0)
} catch {}

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
if (!tags.includes(tag)) {
  sh('git', ['tag', tag, `vue-xr-ui@${version}`])
  sh('git', ['push', 'origin', tag])
}
sh('gh', ['release', 'create', tag, '--title', tag, '--notes', notes])
console.log(`Created release ${tag}.`)
