## Polish Branches

when: whenever
what: entries in `branches_implemented` or `branches_need_polish` of `vault/repositories/galaxy/branches/MY_BRANCHES.md`.

`description` is the branch's queue line.

Suggest:

```
prompt: Run ./POLISH_BRANCH.md {name}
agent_dir: gx_branches
record: galaxy/branches/{name}
description: ✨ {description}
status: recommended
```

## Track Untracked PRs

when: whenever
what: open `galaxyproject/galaxy` PRs by jmchilton from the last 3 days that aren't in `MY_BRANCHES.md`.

For each PR number `n`, `description` is its title.

Suggest:

```
prompt: Add galaxyproject/galaxy#{n} to vault/repositories/galaxy/branches/MY_BRANCHES.md per ../_shared/MY_BRANCHES_INDEX.md, creating its branch record.
agent_dir: gx_branches
link: https://github.com/galaxyproject/galaxy/pull/{n}
profile: Sonnet (medium)
description: 📥 {description}
status: recommended
```

## De-conflict Branches

when: whenever
what: entries in `MY_BRANCHES.md` whose PR has merge conflicts with its base, skipping `branches_need_decision`, reference-only and do-not-PR branches, and standing branches (those with a `../gx_standing/standing_branches/{name}/` record; gx_standing owns them).

`description` is the branch's queue line plus the conflicting files. Add `priority: high` when the PR is out of draft.

Suggest:

```
prompt: De-conflict branch {name}. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/{name}/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
agent_dir: gx_branches
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/branches/{name}
profile: Sonnet (high)
description: 🔀 {description}
status: recommended
```

## Respond to Review (deferential)

when: whenever
what: PRs in `MY_BRANCHES.md` with a review or review comments from mvdbeek or davelopez that we haven't answered (no jmchilton reply or push since).

`reviewer` is their login; `description` is the branch's queue line plus a one-line gist of the review.

Suggest:

```
prompt: Respond to {reviewer}'s review of galaxyproject/galaxy#{n} (branch {name}) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/{name}/.
agent_dir: gx_branches
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/branches/{name}
profile: Opus (low)
description: 🙇 {description}
status: recommended
```

## Respond to Review (confirmatory)

when: whenever
what: as above, for reviews from anyone else (not jmchilton, not bots). A push after the review doesn't count as an answer when the reviewer's points have a drafted reply that is still unposted (see Post Drafted Review Replies).

Suggest:

```
prompt: Respond to {reviewer}'s review of galaxyproject/galaxy#{n} (branch {name}) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/{name}/. Confirm your plan with me before changing the branch.
agent_dir: gx_branches
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/branches/{name}
profile: Opus (low)
description: 💬 {description}
status: recommended
```

## Post Drafted Review Replies

when: whenever
what: PRs in `MY_BRANCHES.md` whose record has a drafted reply (`review_pushback_*.md`, `review_response.md`) that isn't posted on the PR yet.

`file` is the draft's name; `description` is the branch's queue line.

Suggest:

```
prompt: Show me the drafted reply in {file} for galaxyproject/galaxy#{n} (branch {name}). Post it with the agent marker per ../_shared/AGENT_MARKERS.md once I say go.
agent_dir: gx_branches
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/branches/{name}
profile: Opus (low)
description: 📮 {description}
status: recommended
```

## Merge Branches
when: daily
what: entries in `ready` that have an approval and no outstanding review comments to address

Suggest:

```
prompt: Let's talk about branch {name}. The branch record is vault/repositories/galaxy/branches/active/{name}/.
agent_dir: gx_branches
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/branches/{name}
description: 🔀 {description}
status: recommended
```

@../_shared/BLOCKER_SUGGESTED_TASKS.md
