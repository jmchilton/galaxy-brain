## Polish Branches

when: whenever
what: entries in `branches_implemented` or `branches_need_polish` of `vault/repositories/galaxy/branches/MY_BRANCHES.md`.

`description` is the branch's queue line.

Suggest:

```
prompt: Run ./POLISH_BRANCH.md {name}
agent_dir: gx_branches
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
profile: Sonnet (medium)
description: 📥 {description}
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
profile: Opus (low)
description: 🙇 {description}
status: recommended
```

## Respond to Review (confirmatory)

when: whenever
what: as above, for reviews from anyone else (not jmchilton, not bots).

Suggest:

```
prompt: Respond to {reviewer}'s review of galaxyproject/galaxy#{n} (branch {name}) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/{name}/. Confirm your plan with me before changing the branch.
agent_dir: gx_branches
profile: Opus (low)
description: 💬 {description}
status: recommended
```

## Decide Branches

when: daily
what: entries in `branches_need_decision`.

`description` is the branch's queue line plus the decision recorded in its branch record.

Suggest:

```
prompt: Let's talk about branch {name}. The branch record is vault/repositories/galaxy/branches/active/{name}/.
agent_dir: gx_branches
description: 🤔 {description}
status: idea
```
