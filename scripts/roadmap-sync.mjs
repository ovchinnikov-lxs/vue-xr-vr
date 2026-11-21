// Syncs .github/roadmap.yml to GitHub: labels, milestones, issues, and the
// "vue-xr-ui roadmap" Project board. Run by .github/workflows/roadmap.yml.
//
// Only adds and updates, never closes, reopens or deletes (see roadmap.yml).
//
// Env:
//   GITHUB_TOKEN       repo token (issues: write)            required
//   GITHUB_REPOSITORY  owner/name                            required
//   PROJECT_TOKEN      token with `project` scope (classic) or Projects
//                      read/write (fine-grained); without it the board is skipped
//   DRY_RUN=1          print what would change, change nothing
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const PROJECT_TITLE = 'vue-xr-ui roadmap'
const { GITHUB_TOKEN, GITHUB_REPOSITORY, PROJECT_TOKEN } = process.env
const DRY = process.env.DRY_RUN === '1'
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required')
const [owner, repo] = GITHUB_REPOSITORY.split('/')
const plan = parse(readFileSync(new URL('../.github/roadmap.yml', import.meta.url), 'utf8'))

async function gh(method, path, body, token = GITHUB_TOKEN) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function all(path) {
  const out = []
  for (let page = 1; ; page++) {
    const batch = await gh('GET', `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`)
    out.push(...batch)
    if (batch.length < 100) return out
  }
}

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${PROJECT_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

const write = async (label, fn) => {
  console.log(`${DRY ? '[dry] ' : ''}${label}`)
  return DRY ? null : fn()
}

// ---- labels
const labels = new Map((await all(`/repos/${owner}/${repo}/labels`)).map((l) => [l.name, l]))
for (const l of plan.labels) {
  const have = labels.get(l.name)
  if (!have) await write(`label + ${l.name}`, () => gh('POST', `/repos/${owner}/${repo}/labels`, l))
  else if (have.color !== l.color || (have.description ?? '') !== l.description)
    await write(`label ~ ${l.name}`, () => gh('PATCH', `/repos/${owner}/${repo}/labels/${encodeURIComponent(l.name)}`, { color: l.color, description: l.description }))
}

// ---- milestones
const milestones = new Map((await all(`/repos/${owner}/${repo}/milestones?state=all`)).map((m) => [m.title, m]))
for (const m of plan.milestones) {
  const have = milestones.get(m.title)
  if (!have) {
    const created = await write(`milestone + ${m.title}`, () => gh('POST', `/repos/${owner}/${repo}/milestones`, m))
    milestones.set(m.title, created ?? { number: 0, title: m.title })
  } else if ((have.description ?? '') !== m.description) {
    await write(`milestone ~ ${m.title}`, () => gh('PATCH', `/repos/${owner}/${repo}/milestones/${have.number}`, { description: m.description }))
  }
}

// ---- issues (pull requests are excluded; matched by exact title)
const issues = new Map(
  (await all(`/repos/${owner}/${repo}/issues?state=all`)).filter((i) => !i.pull_request).map((i) => [i.title, i]),
)
for (const item of plan.issues) {
  const milestone = item.milestone ? milestones.get(item.milestone)?.number : undefined
  if (item.milestone && milestone === undefined) throw new Error(`Unknown milestone "${item.milestone}" in "${item.title}"`)
  const have = issues.get(item.title)
  if (!have) {
    const created = await write(`issue + ${item.title}`, async () => {
      const issue = await gh('POST', `/repos/${owner}/${repo}/issues`, {
        title: item.title,
        body: item.body ?? '',
        labels: item.labels ?? [],
        milestone,
      })
      if (item.state === 'closed')
        return gh('PATCH', `/repos/${owner}/${repo}/issues/${issue.number}`, { state: 'closed', state_reason: 'completed' })
      return issue
    })
    if (created) issues.set(item.title, created)
  } else {
    const haveLabels = have.labels.map((l) => l.name)
    const missing = (item.labels ?? []).filter((l) => !haveLabels.includes(l))
    if (missing.length || (milestone && have.milestone?.number !== milestone))
      await write(`issue ~ #${have.number} ${item.title}`, () =>
        gh('PATCH', `/repos/${owner}/${repo}/issues/${have.number}`, { labels: [...haveLabels, ...missing], milestone }),
      )
  }
}

// ---- project board
if (!PROJECT_TOKEN) {
  console.log('PROJECT_TOKEN is not set: skipping the Project board (see CLAUDE.md, "Planning").')
  process.exit(0)
}
const { user, repository } = await graphql(
  `query($owner: String!, $repo: String!) {
    user(login: $owner) { id projectsV2(first: 50) { nodes { id number title url } } }
    repository(owner: $owner, name: $repo) { id }
  }`,
  { owner, repo },
)
let project = user.projectsV2.nodes.find((p) => p.title === PROJECT_TITLE)
if (!project) {
  project = await write(`project + ${PROJECT_TITLE}`, async () => {
    const data = await graphql(
      `mutation($owner: ID!, $repo: ID!, $title: String!) {
        createProjectV2(input: { ownerId: $owner, repositoryId: $repo, title: $title }) { projectV2 { id number title url } }
      }`,
      { owner: user.id, repo: repository.id, title: PROJECT_TITLE },
    )
    const p = data.createProjectV2.projectV2
    await graphql(
      `mutation($id: ID!, $desc: String!, $readme: String!) {
        updateProjectV2(input: { projectId: $id, shortDescription: $desc, readme: $readme, public: true }) { projectV2 { id } }
      }`,
      { id: p.id, desc: 'Road to vue-xr-ui 1.0: npm library + docs site + MR + demo app', readme: plan.definition_of_done },
    )
    return p
  })
  if (!project) process.exit(0) // dry run
}
console.log(`Project: ${project.url}`)

const { node } = await graphql(
  `query($id: ID!) { node(id: $id) { ... on ProjectV2 {
    field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
    items(first: 100) { nodes { id content { ... on Issue { number } } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } }
  } } }`,
  { id: project.id },
)
// Note: boards with more than 100 items need pagination here.
const status = node.field
const option = (name) => status?.options.find((o) => o.name.toLowerCase() === name)?.id
const onBoard = new Map(node.items.nodes.filter((i) => i.content).map((i) => [i.content.number, i]))

for (const issue of issues.values()) {
  let item = onBoard.get(issue.number)
  if (!item) {
    item = await write(`board + #${issue.number}`, async () => {
      const d = await graphql(
        `mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: { projectId: $p, contentId: $c }) { item { id } } }`,
        { p: project.id, c: issue.node_id },
      )
      return { id: d.addProjectV2ItemById.item.id, fieldValueByName: null }
    })
    if (!item) continue
  }
  const want = issue.state === 'closed' ? option('done') : item.fieldValueByName ? null : option('todo')
  if (status && want && item.fieldValueByName?.name?.toLowerCase() !== (issue.state === 'closed' ? 'done' : 'todo'))
    await write(`board status #${issue.number} -> ${issue.state === 'closed' ? 'Done' : 'Todo'}`, () =>
      graphql(
        `mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
          updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { singleSelectOptionId: $o } }) { projectV2Item { id } }
        }`,
        { p: project.id, i: item.id, f: status.id, o: want },
      ),
    )
}
