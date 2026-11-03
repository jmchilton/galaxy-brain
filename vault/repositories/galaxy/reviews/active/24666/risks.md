Mostly a two-way door: the only lasting artifact is a new `tool_source_populate_lease` table in the tool source store database (a rebuildable cache), but boot/reload now block on a cross-process lease on a release branch, so a lease bug shows up as stalled startups rather than a rollback-proof data problem.

<details><summary>Risk Details</summary>

- Adds a persisted table to every writable store; reverting the code leaves an unused table behind (harmless, but shared-DB operators who manage schema manually must create it or get uncoordinated populates with a warning).
- Boot and toolbox reload can now wait indefinitely on a holder that hangs while its renewal thread keeps the lease alive (acknowledged in the PR as unbounded).
- Takeover depends on wall-clock `now()` across hosts; skew over the 120 s TTL could let a waiter steal a live lease or delay takeover of a dead one.
- A waiter reuses a peer's index whenever `populated_at` changed and the index is non-empty, even if `needs_population` still says stale - a peer with a different tool conf could leave this process on a mismatched index.
- `populate_store.py`, `reconcile_index` and watch mode bypass the lease, so concurrent writes from those paths remain possible.
- `BEGIN IMMEDIATE` schema creation is SQLite-only; remote backends keep the old best-effort `create_all` race.
- Lands on `release_26.2`, so behavior reaches deployments in a point release.

</details>

<details><summary>Risk Review Advice</summary>

Focus on `coordination.populate_once` and the peer-reuse shortcut in `CachedToolBox._populate_once`: confirm processes sharing a store but with different tool confs cannot adopt each other's index incorrectly, and that a hung holder is an acceptable failure mode for multi-process deployments (gunicorn workers, job handlers).

Also sanity-check `_SqlAlchemyPopulateLease.try_acquire`'s update-then-insert path on Postgres/MySQL shared stores and the clock-skew assumption behind `LEASE_TTL`.

</details>
