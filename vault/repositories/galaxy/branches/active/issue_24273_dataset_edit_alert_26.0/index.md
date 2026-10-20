# issue_24273_dataset_edit_alert_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24273_dataset_edit_alert_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24273_dataset_edit_alert_26.0)

## Status

Status: hardening in progress (recovered from a non-workhorse session). Base: `release_26.0` (`f90a897bfbe`). Head: `e9af550063e`. Fork: `jmchilton/issue_24273_dataset_edit_alert_26.0`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24273_dataset_edit_alert_26.0`.

No PR yet. CI not yet seen.

Fixes [#24273](https://github.com/galaxyproject/galaxy/issues/24273): scheduled Selenium `test_dataset.py::TestDataset::test_history_dataset_rename` times out waiting for `.dataset-attributes-alert`.

[Initial implementation](initial_implementation_debrief.md)

## Decisions

- Base `release_26.0`: failure seen in the weekly dev Selenium run. The same `isLoading || !dataset` gate exists on `release_25.1`, so 25.1 is likely affected too; kept 26.0 since the fix depends on watcher ordering in DatasetView, which changed between 25.1 and 26.0.
