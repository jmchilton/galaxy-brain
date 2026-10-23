# library_collection_selected_history_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:library_collection_selected_history_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/library_collection_selected_history_26.1)

## Status

Status: PR open as draft (`ci_wait`), approved by John via launch 2026-10-23, SHA `4189977901c`.

Base: `release_26.1` (`d808b6425b8`). Head: `4189977901c` on `jmchilton`. Worktree: `~/projects/worktrees/galaxy/branch/library_collection_selected_history_26.1`.

PR: [#24399](https://github.com/galaxyproject/galaxy/pull/24399), draft until reruns settle.

Fork CI green except Playwright (`test_import_dataset_from_history`) and Integration (interactive tools Pulsar) reds, both diagnosed unrelated; reruns queued.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md)

## Summary

Collections now get built in the history the user picked, not the current one. This covers the data library's Add to History > as a Collection, and Build List / Auto/Advanced Build List from an owned non-current history's view page. The branch also adds missing E2E coverage of library Add to History > as Datasets. A queued issue covers the library bug: [library_collection_ignores_selected_history](../../../../../agents/gx_issues/to_file/library_collection_ignores_selected_history.md) (not filed).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Original scope alt](alts/original_scope.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

## Decisions

- Extracted from [galaxy_ui_driver](../galaxy_ui_driver/index.md) `1d227e6fc4c` (fix) and `913dfd7dfd6` (datasets test), at tip `6c434fc3a15`.
- John asked for `release_26.1`. The bug is also on 25.1 and 26.0.
- `162dfdb49b4` (collection upload hid count) stays on galaxy_ui_driver. Its helper isn't on 26.1, and on 26.2/dev the private copy has no collection caller.
- Re-scoped to fix ListWizard, which had the same root cause. The original scope is kept as alt `library_collection_selected_history_26.1_alt_original_scope`.
