# Test challenges debrief — PR #24666

Reviewed commit `7587ed8a9ff` (base `release_26.2`). Profile gx_test_challenger, Opus 5.5, low effort.

## Runs

- `test_coordination.py`: 9 passed. `test_sqlite_store.py -k "processes or existing_store"`: 2 passed. `test_cached_tool.py -k peer`: 5 passed (sibling 24415 venv, worktree `lib` on PYTHONPATH; worktree has no `.venv`).
- Red check: replacing `self._create_sqlite_schema()` with plain `_metadata.create_all(self._engine)` makes `test_processes_opening_a_new_store_concurrently_all_succeed` fail 3/3. Reverted; worktree clean.

## Per-test challenge

| Test | Verdict |
| --- | --- |
| coordination: takes_over / failed_populate / holder_keeps_lease / failed_release / composite | Keep. Real SQLite lease, behavior-level. |
| coordination: uses_peer_populate / repopulates_unusable / keeps_waiting_transient | Keep, but `time.sleep(0.2)` gates ordering (see P2 1). |
| `_FlakyLease` | Keep; a delegating fake beats MagicMock. |
| coordination: one_of_many_processes (subprocess) | Keep; the real cross-process guarantee. |
| sqlite: processes_opening_new_store | Keep; verified red without fix. |
| sqlite: existing_store_adds_lease_table | Keep; upgrade path. |
| cached_tool: waits_for_a_peer | Keep, but sleep-timed and monkeypatches private methods (P3 1). |

No API/integration/Selenium layer fits better: the bug is multi-process boot against one SQLite file; subprocess unit tests are the right layer. No E2E needed.

## Test plan (recommendations)

1. Replace `time.sleep(0.2)` "let the waiter reach the poll loop" with a deterministic signal, e.g. wrap the lease so `try_acquire` sets a `threading.Event` after its first failed attempt, and release only after the event fires.
2. In `test_toolbox_waits_for_a_peer_populating_the_store`, same signal so the test cannot pass vacuously when the boot thread starts late; assert the wait path was taken.
3. Add coverage for the fast-panel-init call site (`_populate_once(lambda: bool(self._panel_ids_missing_from_index()))`) and for `peer_result_usable` rejecting an empty reloaded index at the toolbox level.
4. Add tests for the fallbacks: read-only store `populate_lease()` returns `None` (populate runs uncoordinated), and `last_populated_at` raising `SQLAlchemyError` (missing lease table on a remote DB) still populates.
5. Extract the duplicated ready/go subprocess harness in `test_coordination.py` and `test_sqlite_store.py` into one helper.
