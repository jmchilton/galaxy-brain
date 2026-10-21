# issue_24273_dataset_edit_alert_26.0_baseline

- [PR #24297](https://github.com/galaxyproject/galaxy/pull/24297)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24273_dataset_edit_alert_26.0_baseline)

The leading baseline tests, refactor commits, and #23985 backport of [`issue_24273_dataset_edit_alert_26.0`](../../active/issue_24273_dataset_edit_alert_26.0/index.md), cut at its 7th commit for a PR that lands first. Base: `release_26.0` (`f90a897bfbe`).

## Status

Merged into `release_26.0` 2026-10-21 ([#24297](https://github.com/galaxyproject/galaxy/pull/24297)).

## Decisions

- John chose to include davelopez's #23985 backport (`9cb9df41c63`, `-x`) as commit 7. It changes behavior (save errors show the server's message), so the PR description says so.
