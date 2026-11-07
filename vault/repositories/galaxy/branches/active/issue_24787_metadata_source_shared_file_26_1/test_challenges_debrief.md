Run via Opus 5.5 at medium effort.

The tests held up, so this pass made only small cleanups in two new commits, `6953cb52a99` and `b6d91bbfa8c`. No test was dropped or moved to another layer, and no production code changed. Every new test fails at its own assertion without the branch, and baseline tests pass without it. Four behaviours remain without a test, listed under Gaps. Nothing was pushed, and the "Baseline tests" commit is still first.

## Changes

| Test | Change | Why |
|---|---|---|
| `test_set_metadata_on_output_keeps_input_index`, `test_set_metadata_separates_output_already_sharing_input_file` | Use `validate_dataset_and_wait`; drop the `state == "ok"` asserts | The populator already had this helper. Its details call asserts the dataset ends ok. The old comment implied that waiting on `validated_state` wasn't enough, but both tests pass with it and still catch the bug. |
| `test_cleanup_keeps_metadata_file_a_live_row_names` | First stage asserts `.purged`, not `.deleted` | `cleanup_datasets.py` sets both, and `.purged` is the stronger check for a row whose file is kept. The pgcleanup test stays on `.deleted`, the only flag that script sets. |
| `test_make_copy_of_new_metadata_file_for_copy_of_dataset` | Drop the same-instance assert | Integration already covers it: without that branch, an upload under extended metadata loses its index. |

## Challenges with no change

- **`test_make_copy_of_new_metadata_file_for_copy_of_dataset`:** kept for the copy case. A mutation that reuses the file only for the same instance fails this test. That mutation wasn't run against integration, and the debrief doesn't claim integration misses it.
- **`test_metadata_from_sessionless_import_keeps_new_metadata_file`:** kept. Removing the id comparison in `_shares_dataset` fails only this test; all 7 integration tests pass. An earlier review found that path has no production caller, and a comment on `load_metadata` says it's there for unit tests. So this test guards an interface method, not a production path.
- **Mocks:** there's nothing to replace. The unit tests use the module's `_mock_app` and real import objects.
- **Hand-built rows:** `_share_input_metadata_file` and `_metadata_files_with_same_uuid` build their rows directly. Fixed code can no longer produce that state through the API, so this is the right layer.
- **Integration classes:** kept all three, since each needs its own config. The mixed `store_by` class pins the regression from the first version of the fix.
- **E2E:** none warranted, since nothing touches the UI.

## Results

Reverted means `metadata.py`, `cleanup_datasets.py` and `pgcleanup.py` were restored to the base in the working tree, with the tip's tests. The baseline commit wasn't checked out on its own. pgcleanup runs used the local Postgres container.

| Run | Result |
|---|---|
| Tip: `test_metadata_source_metadata_files.py` | 7 passed |
| Tip: `test_model_store.py` | 48 passed, 1 xfailed |
| Tip: the new `cleanup_datasets.py` test on SQLite, the new pgcleanup test on Postgres | 1 passed each |
| Reverted, baseline tests: directory class and 2 unit tests | 4 passed |
| Reverted, extended and mixed classes | 5 failed, at uuid equality (line 112) or the sentinel (lines 126, 152) |
| Reverted: `cleanup_datasets.py` test | Failed at line 149, `b'' == b'index'` |
| Reverted: pgcleanup test | Failed at line 256, the file is gone |

The reverted and mutation runs came before `b6d91bbfa8c`, which only removes an assert. Afterwards I reran the 2 unit tests and the full unit file. The rest of `test_scripts.py` and `test_scripts_pgcleanup.py` wasn't run, only the new test in each.

| Mutation | Caught by |
|---|---|
| `_shares_dataset` always `True` | Extended class, at the named assertions. Both unit tests pass, as expected. |
| `_shares_dataset` always `False`, or never reuse an id-less file in `make_copy` | Both unit tests and 5 integration tests. Integration fails in `_run_tool` setup with `AttributeError`, not at a named assertion. |
| No id comparison | Import unit test only |
| No `from_external_value` check | `test_set_metadata_separates_output_already_sharing_input_file` only, at the sentinel |
| `cleanup_datasets.py` guard always off | The new test, first stage |
| `cleanup_datasets.py` guard always on | The new test, second stage |
| pgcleanup guard off | The new test |
| pgcleanup guard ignores `deleted` | The new test, second stage |
| `cleanup_datasets.py` guard ignores `deleted` | **Not caught**, see Gaps |

ruff, black and isort pass on the changed test files. mypy reports one error in `test_scripts.py`, in `_scripts_check_output`, which this branch doesn't change.

## Gaps

I didn't add tests for these. Any test here would pass on the base, so it would belong in the baseline commit, and that would need a history rewrite. Each failure below would leave a file behind or skip a cleanup, not lose data.

- **`deleted` filter in `_metadata_file_named_by_live_row`:** removing it passes the test, because this script sets `purged` along with `deleted`. It only matters for rows deleted but not purged, such as those left by pgcleanup or a run without `--remove_from_disk`.
- **NULL uuid in `_uuid_in_use`:** a one-off Postgres test, not committed, passed both with and without the `None` check, so it proves nothing. It asserted only exit code and `deleted`. The likely reason is the catch-all around the run sequence (`pgcleanup.py`, around line 1436), which would swallow the `TypeError`, but I didn't confirm that. A real test would have to assert on the log or on removal of other files.
- **Two rows with one uuid purged in one run:** not covered, as the re-scope review also noted.
- **`store_by: id` skipping the guards:** not covered.

`extended_celery` still isn't run, and CRAM still has no case. Both were already reported in earlier rounds.
