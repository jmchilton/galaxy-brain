# Test challenges review: PR 24673

Profile `gx_test_challenger` (`_shared/reviewers/gx_test_challenger.md`), Opus 5.5 (claude-opus-5-5), low effort. Reviewed commit `7db61c5f53a00485aa058a02ce0cd2533034ce3b`.

The three new tests are well placed and should stay: real PostgreSQL sessions, deterministic interleaving, end-state assertions. The gaps are in behavior the PR description claims but no test pins. Tests were not run (no `.venv` or local PostgreSQL in the shared worktree); this is from reading the code. No E2E test is needed. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1: No test that a copy's lock leaves ordinary source updates unblocked

The description says `KEY SHARE` never blocks job finishing or metadata updates. Weakening the lock to `FOR SHARE` would pass all current tests and stall job finishing behind any open copy transaction. Add a PostgreSQL test: hold an uncommitted `source.copy()`, update a non-key column of the source from another session on a thread, and assert the thread finishes while the copier is still open.

## P2 2: `Job.copy_from_job` and its id-ordered locks are never exercised

Tests call `HistoryDatasetAssociation.copy_from` directly, so removing the new ordered `FOR UPDATE` block in the production entry point passes everything, despite the description's no-deadlock claim. Add a PostgreSQL test with a two-output job: the copier holds the lower-id output's copy, the runner blocks in `copy_from_job`, then the copier copies the higher-id output and commits. Assert no deadlock and both copies on the cached datasets. Check first that the iteration order of `output_datasets` can be arranged to visit the higher id first, or the test won't go red.

## P3 1: Copies of copies are claimed but untested

Commit `output -> element -> element_of_element`, swap from a fresh session, and assert all share the cached dataset. This covers the `_lock_and_load_copies` query and the recursion, and runs on SQLite too.

## P3 2: Preserving `deleted` on copies is untested

`copy_from` now restores `visible` and `deleted`, but `test_copy_from_keeps_visibility_of_copies` only checks `visible`. Add a deleted copy that stays deleted.

## P3 3: Existing API regression test asserts little

`test_run_cat1_use_cached_job_build_list` only checks that the element's content is truthy. Also assert the element is `ok` and `visible is False`. Both hold however the race lands, and the hidden check covers the user-visible symptom the description calls out.

## P3 4: `engine` fixture reuse and global state

Importing `MockObjectStore` from `test_galaxy_mapping` runs that module's registry setup, so the fixture's own registry load is redundant; move the class to shared test utilities or drop the load. The URL selection duplicates `url` in `model_testing_utils`; reuse it if module-scoped `tmp_directory` is cheap. The global object store and datatypes registry stay set after the module in a shared process; restore them on teardown (no cross-test failure confirmed).
