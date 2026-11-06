# Test challenges debrief: PR 24673

Profile `gx_test_challenger`, Opus 5.5 (claude-opus-5-5), low effort. Reviewed commit `7db61c5f53a00485aa058a02ce0cd2533034ce3b`. REVIEW_DIRECTORY mode: recommendations only.

Static review. Tests were not run: the worktree has no `.venv`, no local PostgreSQL is running, and the worktree is shared read-only. Red/green claims below are from reading the code, and the PR's own "fails with either half of the fix removed" claim was not reproduced.

## Challenge results for existing tests

| Test | Challenge outcome |
| --- | --- |
| `test_copy_committed_after_swap_starts_follows_swap` | Keep. Real database, two sessions, asserts the end state. An API test can't force this interleaving. |
| `test_copy_of_stale_source_after_swap_locked_follows_swap` | Keep. Also covers `refresh_unmodified` keeping a pending rename, so that helper needs no dedicated test. |
| `test_copy_from_keeps_visibility_of_copies` | Keep. Red without the fix (`copy_from` used to copy `visible` from the source). Only covers half the behavior (T4). |

No mocks to replace beyond the object store, and no doctests or implementation-only tests to drop. `_wait_until_blocked` counts lock waiters across the whole database, which is sound because the database is unique to the module. CI: `GALAXY_TEST_DBURI` is set at workflow level, so the new step does not silently skip.

E2E: not needed. The fix has no UI, and the existing API test `test_run_cat1_use_cached_job_build_list` is the end-to-end regression, though it can't force the race.

## Test plan

### T1: copy lock does not block ordinary source updates (PostgreSQL)

The PR description states `KEY SHARE` never blocks job finishing or metadata updates. Nothing guards it. Changing the lock to `read=True` without `key_share=True` would pass every current test while stalling job finishing behind any open copy transaction.

Open a copier session and call `source.copy(flush=False)` on a queued HDA without committing. In a second session, update a non-key HDA column and commit, on a thread. Assert the thread finishes while the copier is still open (`thread.join(timeout)`, then `assert not thread.is_alive()`).

### T2: `Job.copy_from_job` lock ordering (PostgreSQL)

All tests call `HistoryDatasetAssociation.copy_from` directly, so the production entry point and its id-ordered `FOR UPDATE` are never run. Removing that block would pass every test.

Build a job with two outputs, with the higher-id output's association first so `io_dicts` yields it first (`out_data` follows `self.output_datasets`; confirm that relationship's order is controllable). Copier copies the lower-id output and holds its transaction. Runner runs `copy_from_job` on a thread; `_wait_until_blocked`. Copier then copies the higher-id output and commits. Assert no deadlock error on either side and both copies share the cached datasets. Without the ordered lock, the runner holds the higher id and waits on the lower while the copier waits on the higher: a deadlock.

### T3: copy of a copy (SQLite-compatible for the sequential case)

The PR description claims copies of copies follow the same rule through recursion. Commit `output -> element -> element_of_element`, run `output.copy_from(cached)` in a fresh session so only the committed-copies query can find them, and assert all three share the cached dataset. This exercises `_lock_and_load_copies` query results and also runs without PostgreSQL.

### T4: `deleted` preserved on copies

The fix restores `visible` and `deleted`; the test only checks `visible`. Extend the test (or parametrize) with a deleted copy that stays deleted and an undeleted source.

### T5: strengthen the existing API test

`test_run_cat1_use_cached_job_build_list` only asserts the element's content is truthy. Assert the element's `state == "ok"` and `visible is False` after `wait_for_job`. Both hold whether or not the late hit wins the race, and the second catches the hidden element reappearing in the history at the layer users see.

### T6: fixture cleanup

- `from .test_galaxy_mapping import MockObjectStore` runs that module's top-level datatypes registry setup at import, which makes the fixture's own `Registry()` load redundant. Move `MockObjectStore` to a shared location such as `galaxy.model.unittest_utils`, or drop the redundant load.
- The `engine` fixture re-implements the Postgres-or-SQLite URL choice from the module-scoped `url` fixture in `model_testing_utils`. It needs a module-scoped `tmp_directory`, which may be why it wasn't reused; use it if that's cheap.
- `setup_global_object_store_for_models` and `set_datatypes_registry` are left set after the module, with an object store whose `exists` is false, and `test/unit/data` shares a process. Restore them on teardown. No actual cross-test failure was confirmed.
