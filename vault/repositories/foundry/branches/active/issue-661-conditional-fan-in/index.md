---
upstream_base_branch: main
related_records: foundry/issues/670
pr: 755
---
# Extend the route pattern to mapped `when`-gated branches

- [PR #755](https://github.com/galaxyproject/foundry/pull/755)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-661-conditional-fan-in)

## Status

Branch on `jmchilton`, merged with `origin/main` at `195b4a6a`, head `5f1f34db`, reviewed and fixed. Worktree `~/projects/worktrees/foundry/branch/issue-661-conditional-fan-in`.

Draft PR [#755](https://github.com/galaxyproject/foundry/pull/755), mergeable; body is [pr_description.md](pr_description.md).

Local `make -k check` green at `5f1f34db` except `check-vendored` (machine-only). CI at `5f1f34db`: green, including `planemo`.

## Supporting files

- [Implementation debrief](implementation_debrief.md)
- [Review debrief](subagents/review_debrief.md)
- [PR description](pr_description.md)
- [Upstream issue text](upstream_issue_text.md)

## Decision taken by default

None of the four. For John: this uses `the_only_non_null` and `pick_style: only` where #661 proposed `first_or_error`, following the page's own guidance.

Part of #661, which stays open until #738 lands. Plan: [skunkworks_plan.md](../../../issues/needs_decision/670/skunkworks_plan.md).
