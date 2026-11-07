Run via Opus 5.5 at medium effort.

The integration suite went from 18 tests and 18 jobs (278s) to 6 tests and 6 jobs (127s) with the same assertions. The unit test now covers only what integration can't, and its hand-built clone is replaced by a real import.

History was rewritten: `5fb51d0c180` (baseline), `1d2d4303750` (fix). Both replace commits already on `jmchilton` (`d05ea2fbf63`, `70790a281ce`), so publishing needs a force-push. Not pushed.

## Integration tests

**Consolidated the five read-only checks.** They become one test, `test_output_gets_own_metadata_file`. All five inspect the same finished job and describe one bug, and each cost about 10s of job time per class. The trade-off is that the first failing assert hides the rest, which is acceptable here. Without the fix the uuid assert fails first, and that names the bug.

**Kept `test_set_metadata_on_output_keeps_input_index` separate.** It writes to the input's index file, and it covers a different code path, the set metadata job.

**Kept all three classes.** Server startup, not job time, sets the floor for each class. The mixed `store_by` class inherits the set metadata test, which adds little there, but dropping it would need a mixin to save about 15s.

**Helpers.**

- Replaced the raw `_put(.../validate)` with the existing `DatasetPopulator.validate_dataset`.
- Replaced the `dict[str, Any]` that `_run_tool` returned with a `MetadataSourceRun` dataclass.

## Unit tests

`test_make_copy_of_new_metadata_file` mixed cases that pass and fail without the fix, so it fit neither commit under the baseline rule. Each case is resolved below.

| Case | Decision |
|---|---|
| Other persisted Dataset returns `None` | Dropped, same branch as the integration tests |
| Discovered Dataset with no id returns `None` | Dropped, covered by integration |
| Discovered output keeps its own file | Dropped, covered by integration |
| Same dataset and copy of dataset keep the file | Kept as `test_make_copy_of_new_metadata_file_for_copy_of_dataset`, moved to baseline |
| Clone with a hand-set `dataset.id` | Rewritten as `test_metadata_from_sessionless_import_keeps_new_metadata_file`, moved to baseline |

The rewritten test exports a dataset, runs `store.imported_store_for_metadata`, and assigns `d1.metadata = imported.metadata`, as `ExtendedDirectoryMetadataGenerator.load_metadata` does. This confirms the claim in the `_belongs_to_other_dataset` docstring against real import objects. That path still has no production caller, per the prior review. The helper's id comparison stays.

No mocks to replace. No E2E test is warranted, since nothing here touches the UI.

## Results

| Run | Result |
|---|---|
| Baseline commit, unfixed: integration (directory class) | 2 passed |
| Baseline commit, unfixed: new unit tests | 2 passed |
| Tip without the fix: extended and mixed classes | 4 failed, each at its own assertion (lines 114, 131) |
| Tip: full integration file | 6 passed |
| Tip: `test_model_store.py` | 48 passed, 1 xfailed |

Without the fix, line 114 fails on equal uuids and line 131 finds BAI bytes where the sentinel was.

Mutations of `_belongs_to_other_dataset` and `make_copy`:

| Mutation | Caught by |
|---|---|
| Drop the id comparison | Import unit test |
| Always return `True` | Both unit tests |
| Fall through to the copy path instead of `return None` | Mixed class. Fails with `IndexError` on the empty collection in `_run_tool`, not at a named assert |

ruff, black, isort and mypy pass on the test files.

<details><summary>Not changed</summary>

- `extended_celery` still isn't run; prior review already reported this.
- The test tool stays in the baseline commit, since the directory class needs it.

</details>
