---
upstream_base_branch: main
related_records: foundry/issues/670
pr: 754
---
# Document nested `in:` keys and connection step names

- [PR #754](https://github.com/galaxyproject/foundry/pull/754)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-571-nested-in-keys)

## Status

Branch on `jmchilton`, base `origin/main` at `7453431d`, head `a0c22945`, reviewed and fixed. Worktree `~/projects/worktrees/foundry/branch/issue-571-nested-in-keys`.

Draft PR [#754](https://github.com/galaxyproject/foundry/pull/754), in conflict with `main` since #753 merged, in generated files only (cast `_provenance.json`, `content/Dashboard.md`); body is [pr_description.md](pr_description.md).

Local `make -k check` green at `a0c22945` except `check-vendored` (machine-only) and `validate-roadmap` (live GitHub labels, also fails on `origin/main`). CI at `a0c22945`: unrelated only. `test` stops at `validate:roadmap` (also red on `main` at `7453431d`, so no rerun); its skipped steps pass locally except the unrun Pi container test and `check-vendored`.

## Supporting files

- [Implementation debrief](implementation_debrief.md)
- [Review debrief](subagents/review_debrief.md)
- [Draft gxformat2 issue](upstream_issue_gxformat2.md), not filed

## Decision taken by default

None.

Part of the skunkworks effort for #670: [plan](../../../issues/needs_decision/670/skunkworks_plan.md).
