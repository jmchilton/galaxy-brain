# issue_19234_batch_mode_hint_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_19234_batch_mode_hint_25.1?expand=1)
- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24223)

## Status

Merged: [#24223](https://github.com/galaxyproject/galaxy/pull/24223) into `release_25.1` 2026-10-20 at head `9c2404b5a59`; worktree removed.

Title "[25.1] Restore batch info for collections mapped over a collection input"; screenshots hosted on fork branch `pr-assets-issue_19234_batch_mode_hint_25.1`.

## Review

mvdbeek approved 2026-10-19, asking to pull in jmchilton/galaxy#92 first; fast-forwarded in 2026-10-19. It hides the `map_over_type` hint when `flavor` is set (workflow run forms pass a collection to the workflow whole); the submitted `batch` flag is unchanged. New Jest test red on the old `FormData.vue`; FormData suites 40/40, ESLint/Prettier clean. No further work requested.

## About

Fixes galaxyproject/galaxy#19234 (missing batch-mode info): when a collection selected on a tool form will be mapped over (e.g. megahit `list:paired` into a `paired` input), say so. Minimal backport carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Plan](plan.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · Alt: [original scope](alts/original_scope.md)

## Decisions

- Base `release_25.1` (John, 2026-10-17: 26.0 unless small and clear, then 25.1). Fix is small: widen the existing FormData hint condition to the selected value's `map_over_type`; hint logic unchanged on 26.0, merges forward cleanly; server tags `map_over_type` since before 25.1.
- Keep it a subset of the 20657 approach (selection-driven, batch only) so 20657 can rebase over it. No new help terms, component, dropdown markers.
- Re-scoped once (scope eval 1): hint names the job unit ("one job per dataset pair"). Scope eval 2: keep.

## CI diagnosis — 2026-10-19

- Selenium shard 2: `test_histories_list.py::test_permanently_delete_history`, `ElementNotInteractableException`. Saved-histories list, not the tool form. Unrelated; failed job rerun.
