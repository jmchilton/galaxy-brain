# issue_24273_dataset_edit_alert_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24273_dataset_edit_alert_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24273_dataset_edit_alert_26.0)

## Status

Status: `branches_ready_for_final_review` — polished 2026-10-23; awaiting John's read-through (incl. human-read checklist item). Base: `release_26.0` (`817a4795098`), baseline merged as #24297. Head: `c6795829fb1` (22 fix commits). Alt: `issue_24273_dataset_edit_alert_26.0_alt_original_scope`. Fork: `jmchilton/issue_24273_dataset_edit_alert_26.0`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24273_dataset_edit_alert_26.0`.

No PR yet.

Fork CI on `c6795829fb1` running (2026-10-23); prior head's reds were client-cache restore infra.

Polish: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](checklist.md) · [debrief](polish_debrief.md)

Fixes [#24273](https://github.com/galaxyproject/galaxy/issues/24273): scheduled Selenium `test_dataset.py::TestDataset::test_history_dataset_rename` times out waiting for `.dataset-attributes-alert`.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Dependencies

- Baseline [#24297](https://github.com/galaxyproject/galaxy/pull/24297) ([`_baseline`](../../merged/issue_24273_dataset_edit_alert_26.0_baseline/index.md)) merged 2026-10-21; branch rebased, carries only fix commits.

## Decisions

- Base `release_26.0`: failure seen in the weekly dev Selenium run. The same `isLoading || !dataset` gate exists on `release_25.1`, so 25.1 is likely affected too; kept 26.0 since the fix depends on watcher ordering in DatasetView, which changed between 25.1 and 26.0.
- Re-scoped after round 1 scope evaluation (shared `useSettledDataset`, Preview tab, non-blocking refresh errors, #23985 backport); round 2 scope evaluation: keep, with split options A–D.
- Open: test removals awaiting John (see test challenges); follow-ups listed in the implementation debrief.
