# issue_19234_batch_mode_hint_25.1

Status: implementing. Base: `release_25.1` (`8bb256be5b1`). Worktree: `~/projects/worktrees/galaxy/branch/issue_19234_batch_mode_hint_25.1`. Fork: `jmchilton/issue_19234_batch_mode_hint_25.1`.

Fixes galaxyproject/galaxy#19234 (missing batch-mode info): when a collection selected on a tool form will be mapped over (e.g. megahit `list:paired` into a `paired` input), say so. Minimal backport carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[Plan](plan.md)

## Decisions

- Base `release_25.1` (John, 2026-10-17: 26.0 unless small and clear, then 25.1). Fix is small: widen the existing FormData hint condition to the selected value's `map_over_type`; same code on 25.1 and 26.0; server tags `map_over_type` since before 25.1.
- Keep it a subset of the 20657 approach (selection-driven, batch only) so 20657 can rebase over it. No new help terms, component, dropdown markers.
