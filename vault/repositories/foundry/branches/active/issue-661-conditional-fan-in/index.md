---
upstream_base_branch: main
related_records: foundry/issues/670
pr: 755
---
# Extend the route pattern to mapped `when`-gated branches

- [PR #755](https://github.com/galaxyproject/foundry/pull/755)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-661-conditional-fan-in)

## Status

Branch on `jmchilton`, base `origin/main` at `7453431d`, head `bac5ae4b`, reviewed and fixed. Worktree `~/projects/worktrees/foundry/branch/issue-661-conditional-fan-in`.

Draft PR [#755](https://github.com/galaxyproject/foundry/pull/755); body is [pr_description.md](pr_description.md).

Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (live GitHub labels, also fails on `origin/main`); `planemo test` passes on `release_26.1`; CI started when the PR opened.

## Supporting files

- [Implementation debrief](implementation_debrief.md)
- [Review debrief](subagents/review_debrief.md)
- [PR description](pr_description.md)
- [Upstream issue text](upstream_issue_text.md)

## Decision taken by default

None of the four. For John: this uses `the_only_non_null` and `pick_style: only` where #661 proposed `first_or_error`, following the page's own guidance.

Part of #661, which stays open until #753 and #738 land. Plan: [skunkworks_plan.md](../../../issues/wip/670/skunkworks_plan.md).
