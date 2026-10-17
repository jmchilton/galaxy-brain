# issue_19234_batch_mode_hint_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_19234_batch_mode_hint_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_19234_batch_mode_hint_25.1)

## Status

Polished, `branches_ready_for_final_review`. Base `release_25.1` (`8bb256be5b1`), head `22a10b10465`, worktree `~/projects/worktrees/galaxy/branch/issue_19234_batch_mode_hint_25.1`.

No PR yet.

Fork CI on `954306b0bd5` was still queued at polish time with no failures; `22a10b10465` only reverts two test-selector drive-bys.

## About

Fixes galaxyproject/galaxy#19234 (missing batch-mode info): when a collection selected on a tool form will be mapped over (e.g. megahit `list:paired` into a `paired` input), say so. Minimal backport carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Plan](plan.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · Alt: [original scope](alts/original_scope.md)

## Decisions

- Base `release_25.1` (John, 2026-10-17: 26.0 unless small and clear, then 25.1). Fix is small: widen the existing FormData hint condition to the selected value's `map_over_type`; hint logic unchanged on 26.0, merges forward cleanly; server tags `map_over_type` since before 25.1.
- Keep it a subset of the 20657 approach (selection-driven, batch only) so 20657 can rebase over it. No new help terms, component, dropdown markers.
- Re-scoped once (scope eval 1): hint names the job unit ("one job per dataset pair"). Scope eval 2: keep.
