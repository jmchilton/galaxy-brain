# issue_24273_dataset_edit_alert_26.0_baseline

- [PR #24297](https://github.com/galaxyproject/galaxy/pull/24297)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24273_dataset_edit_alert_26.0_baseline)

The leading baseline tests, refactor commits, and #23985 backport of [`issue_24273_dataset_edit_alert_26.0`](../issue_24273_dataset_edit_alert_26.0/index.md), cut at its 7th commit for a PR that lands first. Base: `release_26.0` (`f90a897bfbe`).

## Status

`ready`: head `498f65b48a3`, an exact prefix of the main branch. Vitest at the tip: 47 passed, 2 skipped.

[#24297](https://github.com/galaxyproject/galaxy/pull/24297) "[26.0] Bug fix - missing unit tests needed for dataset details." opened by John 2026-10-20 outside the queue process (skipped polish/final review; own description; labels `kind/bug`, `area/client`).

CI running at 2026-10-20 snapshot (5 green, 15 pending).

## Decisions

- John chose to include davelopez's #23985 backport (`9cb9df41c63`, `-x`) as commit 7. It changes behavior (save errors show the server's message), so the PR description says so.
