---
upstream_base_branch: main
related_records: foundry/issues/670
---
# Extend the route pattern to mapped `when`-gated branches

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-661-conditional-fan-in)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-661-conditional-fan-in)

## Status

Branch on `jmchilton`, base `origin/main` at `7453431d`, head `0070bc1a`. Worktree `~/projects/worktrees/foundry/branch/issue-661-conditional-fan-in`.

No PR yet; a reviewer pass comes first.

Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (live GitHub labels, also fails on `origin/main`). CI runs once the PR opens.

## Supporting files

- [Implementation debrief](implementation_debrief.md)

## Decision taken by default

None of the four. For John: this uses `the_only_non_null` and `pick_style: only` where #661 proposed `first_or_error`, following the page's own guidance.

Part of #661, which stays open until `issue-669-repair-contract` and #738 land. Plan: [skunkworks_plan.md](../../../issues/needs_decision/670/skunkworks_plan.md).
