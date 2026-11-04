# Test challenges review — PR #24666

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md). Model: Opus 5.5. Effort: low. Reviewed commit: `7587ed8a9ff`.

Tests are strong overall: real SQLite leases, a delegating fake instead of mocks, and subprocess tests that hit the actual multi-process race. The schema-race test is verified red-to-green (fails 3/3 with plain `create_all`). All new tests pass locally. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: Sleep-ordered lease tests can flake on slow CI

`test_uses_a_populate_another_process_completed_while_waiting`, `test_repopulates_when_the_peer_result_is_unusable` and `test_keeps_waiting_through_transient_database_errors` use `time.sleep(0.2)` assuming the waiter thread has read `last_populated_at()` before the peer releases. If the thread starts late, it snapshots the already-set `populated_at`, `_populated_since` is false, and it populates — `test_uses_a_populate...` then fails (`result == [True]`). Replace the sleep with an event set from a wrapping lease's first failed `try_acquire` (the `_FlakyLease` pattern already exists).

### P3 1: Toolbox peer-wait test can pass without exercising the wait

`test_toolbox_waits_for_a_peer_populating_the_store` uses the same `sleep(0.2)`; if boot is slow it sees a populated index and never waits, still passing. Use the same signal. It also monkeypatches private `_run_inline_populator` / `_init_tools_from_index`; acceptable given existing `_seam_box` conventions.

### P3 2: Untested branches of the new coordination

No test covers the fast-panel-init call site of `_populate_once`, `peer_result_usable` rejecting an empty reloaded index at the toolbox level (rolling-upgrade case), the read-only `populate_lease() -> None` path, or the `SQLAlchemyError` fallback in `populate_once` when the lease table is missing on a remote DB.

### P3 3: Duplicated subprocess ready/go harness

`test_coordination.py` and `test_sqlite_store.py` each carry the same spawn/ready/go/communicate loop; extract a shared helper.
