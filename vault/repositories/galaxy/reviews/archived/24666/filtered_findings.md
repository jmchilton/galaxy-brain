# Filtered findings, PR #24666 initial review

- **Untested-branch item "fast-panel `_populate_once` call site"** (default P3 3, test P3 2). Filtered: this branch cannot be reached, because `_index_panel_items()` drops ids that are missing from the index. Verified P3 3 and P3 5 note this rather than asking for a test.
- **Thermo note: writable non-SQLite server DBs log a "populating anyway" warning on every boot.** Filtered: the remote-engine path already runs a best-effort `create_all`, which creates the lease table. The warning appears only when an operator has blocked DDL, and the PR body describes that case.
- **Thermo note: `_SqlAlchemyPopulateLease` reaches into the store's private `_session` and `_write_lock`.** Filtered: the thermo review itself rated this acceptable, since the lease is a collaborator in the same module. Not actionable.
- **Perf debrief §3: a lone process on a stale boot runs the staleness check twice.** Filtered: the debrief only notes it and calls it "not worth complexity". P2 1's reorder does not change it.
- **Unbounded wait on a holder that hangs but keeps renewing; `populate_store.py`, `reconcile_index` and watch mode not taking the lease; TTL vs. clock skew.** Filtered: the PR body lists the first two as out of scope. The clock-skew constraint is documented in the `_SqlAlchemyPopulateLease` docstring.

## Trimmed by John

- 2026-11-03 Restarting after a killed populate waits up to 120 s for a holder that no longer exists. Discovered by default via Claude Opus 5.5 at medium.
- 2026-11-03 Some new lease and toolbox branches are untested. Discovered by gx_test_challenger via Claude Opus 5.5 at low and default via Claude Opus 5.5 at medium.
