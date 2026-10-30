# Storage Dashboard history cleanup reads `disk_size` after purging, so it reports 0 bytes freed

- Area: lib/galaxy/managers/histories.py (HistoryStorageCleanerManager.cleanup_items)
- Found while: [[Component - User Disk Usage Accounting]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`HistoryStorageCleanerManager.cleanup_items` (`lib/galaxy/managers/histories.py:712-730`) purges each history and only then adds its size to the result:

```python
self.history_manager.purge(history, flush=False, user=user)
success_item_count += 1
total_free_bytes += int(history.disk_size)
```

`History.disk_size` (`lib/galaxy/model/__init__.py:4097-4114`) sums the sizes of the history's non-purged HDAs of non-purged datasets. With `enable_celery_tasks` off, `HistoryManager.purge` (`histories.py:319-322`) purges every HDA synchronously with `flush=True` first, so `disk_size` is 0 when it is read and the cleanup reports 0 bytes freed. With Celery on, `purge_history_datasets` runs later, so the value depends on whether the task has committed yet.

The Storage Dashboard shows this `total_free_bytes` to the user after a cleanup. The user's disk usage itself is not affected.

## Evidence / repro

Code read only. Repro idea: with Celery disabled, clean up one non-empty history through `DELETE /api/storage/histories` and check `total_free_bytes` in the response.

## Suggested fix

Read `int(history.disk_size)` before calling `purge()`. Open PR #24511 (`[25.1]`) makes this change because its purge marks HDAs purged in the request in both modes; once it merges forward, close this against it.

## Related

- `vault/repositories/galaxy/reviews/active/24511/`
