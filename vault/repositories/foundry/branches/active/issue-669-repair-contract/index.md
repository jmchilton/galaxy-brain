---
upstream_base_branch: main
related_records: foundry/issues/670
pr: 753
---
# Replace `repair-galaxy-draft-topology`'s contract

- [PR #753](https://github.com/galaxyproject/foundry/pull/753)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-669-repair-contract)

## Status

Branch on `jmchilton`, base `origin/main` at `7453431d`, head `c9235876`, reviewed and fixed. Worktree `~/projects/worktrees/foundry/branch/issue-669-repair-contract`.

Draft PR [#753](https://github.com/galaxyproject/foundry/pull/753); body is [pr_description.md](pr_description.md).

Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (live GitHub labels, also fails on `origin/main`). CI started when the PR opened.

## Supporting files

- [Implementation debrief](implementation_debrief.md)
- [Review debrief](subagents/review_debrief.md)
- [Plan](../../../issues/wip/670/skunkworks_plan.md) and [plan review](../../../issues/wip/670/skunkworks_plan_review.md)

## Decisions taken by default

John hasn't answered these. The PR description must repeat them.

- Dead end: repair may remove the step, with `kind: dropped` and a cited `because`.
- Interface shrink on narrowing: allowed.
- Late structural fixes: in-loop yes (a sentence in `advance`), test-phase no. Test-phase routing leaves a stale extract after a direct-only repair, so it needs the harness to call `advance` again, plus `harness_notes` in every pipeline and the debug Mold. Repair's trigger doesn't rule out a post-loop call, so nothing is foreclosed.
- Layout split (F8): out of scope. Repair allows `add-step` plus `rewire`, and no recipe is added.

Closes #669. Part of #670, #660, #661, #654.
