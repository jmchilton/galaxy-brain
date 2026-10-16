# The Software Factory

`vault/agents/` holds a set of long-lived coding agents, one per directory. Start an agent with its directory as the working directory and it picks up its role from `AGENTS.md`. Each `CLAUDE.md` is a symlink to `AGENTS.md`, so both tools read the same instructions.

This directory (`factory/`) is the meta-agent that maintains the factory itself. Changes here should be made in alignment with ./AGENTS.md

## Agents

### Galaxy agents (`gx_*`)

Galaxy development matters most, so it's split across narrowly scoped agents:

| Agent           | Job                                                                         |
| --------------- | --------------------------------------------------------------------------- |
| `gx_reviews`    | Queue and review other people's Galaxy PRs.                                 |
| `gx_issues`     | Triage Galaxy issues; polish and file drafts dropped into `to_file/`.       |
| `gx_workhorse`  | Implement a scoped Galaxy change, then hand the branch off.                 |
| `gx_spike`      | Build a throwaway exploration to talk through a design, then hand it off.   |
| `gx_branches`   | Own `MY_BRANCHES.md`: track CI, rebase, polish, open approved PRs, undraft. |

### Project agents

Daily drivers for one project or a set of related projects. Each one reviews, implements and maintains for its scope: `planemo`, `pulsar`, `docker-galaxy`, `workflow_libs` (gxformat2, galaxy-tool-util-ts, gxwf-web, the VS Code extension) and `wf_foundry`. When work needs a Galaxy change, they hand that branch to `gx_branches` (`GX_IMPLEMENTATION_HANDOFF.md`).

## Anatomy of an agent directory

- `AGENTS.md` — a short role statement, `@../_shared/...` includes, a `PROJECT` binding for those includes, and optionally an **Automatic Actions** list.
- A queue file — `PULL_REQUESTS.md`, `ISSUES.md` or `MY_BRANCHES.md`. One line per item, linking to its record. Queues stay thin; detail lives in records.
- `TICK.md` — the prompt for a recurring loop. Usually "take every Automatic Action" plus a few checks.
- `GOOD_MORNING.md` — the daily triage prompt. May include `TICK.md`, then surfaces what needs John and offers next tasks.

Anything else in an agent directory is working material (process docs, PR description drafts, dated plans).

## Shared fragments (`_shared/`)

Agents compose their instructions from shared fragments rather than copying rules. Naming tells you what a fragment is:

- `*_INDEX.md` — format of a queue file (`PULL_REQUESTS_INDEX`, `ISSUES_INDEX`, `MY_BRANCHES_INDEX`).
- `REPOSITORY_*.md` — layout of the records behind a queue (reviews, issues, branches).
- `GX_*.md` — Galaxy-specific conventions (PR/issue descriptions, risk assessment, implementation hand-off).
- `GX_PROCESS_*.md` — single-purpose subagent steps (challenge tests, polish E2E, scope evaluation, screenshots). They take `BRANCH_DIRECTORY` and `WORKING_DIRECTORY` and write a debrief.
- Cross-cutting rules every agent includes: `VAULT_SYNC`, `SECURITY_REPORTS`, `NOT_VAULT_NOTES`, `WORKTREES`.
- `prompts/` — vendored third-party prompts; local overrides live in `_shared/` (e.g. `SHOW_ME_RULES.md`).

Fragments are parameterized by `PROJECT`, which the including `AGENTS.md` binds.

## Records (`vault/repositories/`)

Durable state lives outside the agent directories:

```
vault/repositories/PROJECT/{reviews,issues,branches}/STATUS/ID/index.md
```

`STATUS` is a directory (`active`/`archived`, `active`/`merged`/`abandoned`, `queued`/`wip`/`blocked`/…), so a record moves when its state changes. Supporting files — debriefs, PR description drafts, screenshots — sit beside `index.md`. Neither agent nor record files are vault notes: no frontmatter, not validated, not on the site.

## How Galaxy work flows

1. `gx_issues` triages issues; any agent can queue an issue draft in `gx_issues/to_file/`.
2. `gx_workhorse` or `gx_spike` implements on a branch, runs the `GX_PROCESS_*` steps, writes debriefs into the branch record, and adds one line to `gx_branches/MY_BRANCHES.md` (`GX_IMPLEMENTATION_HANDOFF.md`).
3. `gx_branches` moves the entry through its sections as CI and John's approvals land, and opens the PR once approved and green.
4. `gx_reviews` handles other people's PRs in parallel.

Implementers never open PRs; only the branch manager does, and only per its Automatic Actions.

## Ground rules

- **Automatic Actions** are pre-authorized exactly as written. Anything else outward-facing needs John.
- Commit and push galaxy-brain tracking changes on `main` after meaningful batches (`VAULT_SYNC`).
- Security findings go to a private file outside the vault (`SECURITY_REPORTS`).
- Prefer editing a shared fragment over adding agent-local rules. Resist over-specifying; the process mostly works.
