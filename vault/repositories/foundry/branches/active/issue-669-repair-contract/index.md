---
upstream_base_branch: main
related_records: foundry/issues/670
---
# Replace `repair-galaxy-draft-topology`'s contract

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-669-repair-contract)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-669-repair-contract)

## Status

Branch on `jmchilton`, base `origin/main` at `7453431d`, head `6f5be153`. Worktree `~/projects/worktrees/foundry/branch/issue-669-repair-contract`.

No PR yet; a reviewer pass comes first.

Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (live GitHub labels, also fails on `origin/main`). CI runs once the PR opens.

## Supporting files

- [Implementation debrief](implementation_debrief.md)
- [Plan](../../../issues/needs_decision/670/skunkworks_plan.md) and [plan review](../../../issues/needs_decision/670/skunkworks_plan_review.md)

## Decisions taken by default

John hasn't answered these. The PR description must repeat them.

- Dead end: repair may remove the step, with `kind: dropped` and a cited `because`.
- Interface shrink on narrowing: allowed.
- Late structural fixes: in-loop yes (a sentence in `advance`), test-phase no. Test-phase routing leaves a stale extract after a direct-only repair, so it needs the harness to call `advance` again, plus `harness_notes` in every pipeline and the debug Mold. Repair's trigger doesn't rule out a post-loop call, so nothing is foreclosed.
- Layout split (F8): out of scope. Repair allows `add-step` plus `rewire`, and no recipe is added.

Closes #669. Part of #670, #660, #661, #654.
