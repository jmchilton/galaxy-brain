# issue_24273_dataset_edit_alert_26.0_baseline

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24273_dataset_edit_alert_26.0_baseline?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24273_dataset_edit_alert_26.0_baseline)

The leading baseline tests, refactor commits, and #23985 backport of [`issue_24273_dataset_edit_alert_26.0`](../issue_24273_dataset_edit_alert_26.0/index.md), cut at its 7th commit for a PR that lands first. Base: `release_26.0` (`f90a897bfbe`).

## Status

`branches_need_polish`: head `498f65b48a3`, an exact prefix of the main branch. Vitest at the tip: 47 passed, 2 skipped.

No PR yet. CI not yet seen.

## Decisions

- John chose to include davelopez's #23985 backport (`9cb9df41c63`, `-x`) as commit 7. It changes behavior (save errors show the server's message), so the PR description says so.
