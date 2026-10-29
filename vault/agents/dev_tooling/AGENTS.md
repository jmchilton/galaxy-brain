# Dev tooling maintenance

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md
@../_shared/AGENT_MARKERS.md

This directory coordinates reviews and related development across:

- [artifact-detective](https://github.com/jmchilton/artifact-detective) — Node framework for normalizing and discovering build artifacts.
- [gh-ci-artifacts](https://github.com/jmchilton/gh-ci-artifacts) — Node tooling for fetching CI results from GitHub.
- [ghwt](https://github.com/jmchilton/ghwt) — Node tooling for managing worktrees.
- [differential-review](https://github.com/jmchilton/differential-review) — tooling for managing differential reviews of changing code.

## Project settings

In the following files, PROJECT is the repository a branch, issue or PR belongs to.

- All four: upstream `jmchilton/PROJECT`, base branch `origin/main`, push remote `origin`. CI runs only on pull requests and `main`, so a pushed branch gets no CI until its PR opens.
- `artifact-detective`, `gh-ci-artifacts` and `ghwt` publish to npm with semantic-release on every push to `main`, so commit subjects follow Conventional Commits (`fix:`, `feat:`). `differential-review` publishes on `v*` tags.

@../_shared/MY_BRANCHES_INDEX.md
@../_shared/REPOSITORY_BRANCHES.md
@../_shared/WORKTREES.md
@../_shared/PROCESS_INITIAL_REVIEW.md
@../_shared/REVIEW_FOCUS.md
@../_shared/MY_ISSUES_INDEX.md
@../_shared/MY_REVIEWS_INDEX.md

Each project has its own branch queue, issue index and review queue:

- artifact-detective: [branches](../../repositories/artifact-detective/branches/MY_BRANCHES.md), [issues](../../repositories/artifact-detective/issues/MY_ISSUES.md), [reviews](../../repositories/artifact-detective/reviews/MY_REVIEWS.md)
- gh-ci-artifacts: [branches](../../repositories/gh-ci-artifacts/branches/MY_BRANCHES.md), [issues](../../repositories/gh-ci-artifacts/issues/MY_ISSUES.md), [reviews](../../repositories/gh-ci-artifacts/reviews/MY_REVIEWS.md)
- ghwt: [branches](../../repositories/ghwt/branches/MY_BRANCHES.md), [issues](../../repositories/ghwt/issues/MY_ISSUES.md), [reviews](../../repositories/ghwt/reviews/MY_REVIEWS.md)
- differential-review: [branches](../../repositories/differential-review/branches/MY_BRANCHES.md), [issues](../../repositories/differential-review/issues/MY_ISSUES.md), [reviews](../../repositories/differential-review/reviews/MY_REVIEWS.md)

The agent running in this directory is also responsible for maintaining and promoting John's branches within those branch queues. Branch records and supporting files live in `vault/repositories/PROJECT/branches/active/<branch_name>/`.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here.

- **Rerun unrelated reds.** For each entry in those queues whose PR or pushed branch has failed CI: unless its branch record has a CI verdict for that head SHA, check CI per [`CHECK_CI.md`](../_shared/CHECK_CI.md) (upstream from the project settings) and replace the record's CI line with the verdict. Then rerun per that file's "Rerun unrelated reds". Skip `branches_need_decision` and `branches_reference` entries.

## Cross-repository work

- `gh-ci-artifacts` depends on `artifact-detective`, and `ghwt` on `gh-ci-artifacts`. Land a change upstream and let it release before bumping the dependency downstream.
- galaxy-brain pins `differential-review` as its `differential-review-lib/` submodule. Bumping that pin is galaxy-brain tooling work for the `factory` agent (see [`TOOLING.md`](../factory/TOOLING.md)).

## Project Philosophy

None of these projects have external users yet - so each should be considered greenfield and legacy preservation concerns should have minimal weight if any at all. We should boldly axe ideas that don't work and focus these projects into isolated, strong abstractions that do one thing and do it really well.

Documentation is important and should be maintained. That doesn't mean adding archeology to every PR - it does mean we should be highlighting our features and how to use them and how to leverage these things from new projects/dev pipelines.

These are vibe coded so every feature request should be accompanied with a check for tech debt that can be reduced while implementing the feature.
