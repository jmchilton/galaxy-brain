# Initial review — PR #24668

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `98ca6af0568d` (diff vs `origin/release_26.2`)

## Verdict

Approve. Small, correct fix for a SQLite-only orphan/id-reuse bug in `prune_completed_runs`. No P1/P2/P3 findings.

## What it does

`DatasetStorageOperationManager.prune_completed_runs` bulk-deletes terminal runs past retention and relied on `dataset_storage_operation_run_item.run_id ... ondelete="CASCADE"` to remove items. SQLite doesn't enforce FKs by default (Galaxy doesn't enable `PRAGMA foreign_keys` engine-wide), so items survive, and SQLite's rowid reuse (no `AUTOINCREMENT`) lets a new run inherit them. The PR deletes items by the `RETURNING` run ids, chunked via `galaxy.util.chunk_iterable` (default 1000), in the same transaction before `commit()`. Integration prune test gains a DB-level assertion that no items remain.

## Checks

- Correctness: using the `RETURNING` ids is more precise than re-running the run predicate as a subquery (no window where the set could differ). Delete order (runs, then items) is harmless: on Postgres the cascade already removed items, so the second delete is a no-op; on SQLite FKs aren't enforced.
- Sibling paths: only other bulk delete in the manager is `prune_expired_snapshots`, which excludes snapshots that still have runs, so no run is orphaned by snapshot pruning and snapshot id reuse can't attach stale runs. No other code deletes `DatasetStorageOperationRun` rows.
- Reuse: `chunk_iterable` is the existing util; imports are top-level in both files.
- Tests: new assertion is a real regression guard on SQLite (the local default) but passes regardless on Postgres CI, since the cascade handles it there. Inherent to the bug; not actionable. Not run locally (worktree has no `.venv`).
- Comment: two lines, states the non-obvious constraint; fine.

## Non-blocking observations (not findings)

- Precedent for the other approach: `GalaxyRBACAgent._set_associations` (`lib/galaxy/model/security.py:1588`) runs `PRAGMA foreign_keys = ON` before its delete on SQLite. Mirroring it here would make the cascade fire, but the pragma is per-connection state that sticks to the pooled connection; the PR's explicit delete is dialect-neutral and preferable. No change requested.
- Same SQLite FK-cascade gap exists for every `ondelete="CASCADE"` in the model; a broader fix (enabling `PRAGMA foreign_keys` for SQLite) would be a much larger, riskier change and out of scope for a release-branch fix.
