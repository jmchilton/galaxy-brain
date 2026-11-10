---
upstream_base_branch: main
related_records:
  - foundry/branches/issue-765-bump-planemo
  - foundry/issues/775
---
# Lint verification workflows with planemo workflow_lint

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-775-verification-workflow-lint)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-775-verification-workflow-lint)
- [PR description](pr_description.md)

## Status

Branch `issue-775-verification-workflow-lint` on `jmchilton`, base `main`; `~/projects/worktrees/foundry/branch/issue-775-verification-workflow-lint`. Closes #775.

No PR yet; it waits for John's go-ahead.

No CI yet because the fork branch has none. Locally, all 31 workflows pass `workflow_lint --skip best_practices` and `make check` is green. With the new `aaafc0ac4dd2` pin, `planemo test` on the datamash workflow passed on release_26.1. Two targets fail, neither from this branch: `validate-roadmap` (#768 and others have no roadmap work areas on GitHub) and `check-vendored`, which fails on this machine only.

## Decisions

- Skip `best_practices` because the workflows are narrow fixtures. That check wants annotation, creator, license and step annotations.
- Pin the installable revision of each IWC-observed tool version. IWC still pins superseded revisions, and planemo 0.75.48 rejects those.

## Follow-ups

- Mold example `advance-galaxy-draft-step/examples/brew3r-1step-degraded` pins the superseded `map_param_value` revision `5ac8a4bf7a8d`. No lint runs on it.
- Carried from #765: `check:planemo-cli` output depends on unpinned click (8.4 vs 8.5 changes flag defaults).
