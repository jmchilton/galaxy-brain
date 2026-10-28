# Re-scope normal review

Verdict ship-it, no bugs. Acted on two items:
- The histories test now also asserts the archived history is unarchived after the purge. That covers `_unarchive_if_needed`. Amended into "Test purging deleted and archived histories…" (head `6d21d8c4d45`), green under both backends.
- The branch record (`index.md`) is updated to the new head, base, helper name and third test.

Not acted on:
- `Literal[...]` type for `operation`: optional. The docstring already lists the ids.
- Moving the docstring's history ids into commit 4: the series is reviewed as a whole.
- Shared setup between the dataset and history tests: the reviewer recommended against it. The only common part is `logout_if_needed()` + `register()`, an existing inline pattern.

<details><summary>Full review</summary>

Verdict: ship it. No real bugs. The new history test is deterministic, the no-wrapper decision is sound, and the commit messages are accurate.

Determinism, checked:
- **Summary refresh.** `StorageManager.vue:56` sets `refreshOperationId` after cleanup. The card shows `LoadingSpan` while it refetches, so `no_items` can't pass on stale data. The second cleanup remounts every card.
- **Empty histories.** The discarded and archived summaries use `count(History.id)`, so a 0-byte history still shows a review link.
- **`purged` is synchronous.** `HistoryManager.purge` sets `history.purged` in-request even with celery, and commits before responding.
- **Archiving a non-current history** with no export record is supported.
- **Overlap.** Discarded is `deleted & !purged` and archived is `archived & !purged`, so the two lists are disjoint. A fresh user plus select-all gives one row each.

Nits:
1. Stale `index.md` (head, helper name, scope).
2. Optional `Literal` alias for `operation`.
3. No shared setup recommended.
4. No-wrapper is sound: a wrapper would be dead API on a release branch. The restack note should say gxui rebinds to `storage_dashboard_cleanup("deleted_datasets", ...)`.
5. Commit messages are accurate. The docstring lists history ids one commit before they're exercised, which is acceptable.
6. Optional strengthening: assert `archived` is False after the purge.

No security-sensitive findings.

</details>
