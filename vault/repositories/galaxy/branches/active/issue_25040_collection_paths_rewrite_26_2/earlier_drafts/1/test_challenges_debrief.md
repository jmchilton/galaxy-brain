Run via Claude Opus 5.5 at high effort.

# Test challenges debrief

I ran `GX_PROCESS_CHALLENGE_TESTS.md` on `7a484fe459a`. That removed 3 unit tests, merged 1 into another, replaced 2 mocks in the baseline helpers, and rebuilt the integration test's setup with existing populators. The baseline changes went into the `Baseline tests` commit with a fixup and autosquash, so that commit is still first. The other changes are a new commit, `Trim compute environment tests for collection path accessors`. Head: `ba7f4c7d9b5`.

## Per-test decisions

Unit tests in `test/unit/app/tools/test_wrappers.py`:

| Test | Decision | Why |
|---|---|---|
| `test_collection_wrapper_path_accessors` (baseline) | Kept, helpers reworked | Pins nested `list:paired` flattening order, identifier tuples, `serialize()` and `data_style="paths"` output without a compute environment. No framework test covers nested identifiers in staging paths. |
| `test_collection_wrapper_path_accessors_without_a_collection` (baseline) | Kept | Covers the `__input_supplied` branch the fix now relies on for an unset optional collection. It's small and costs nothing. |
| `test_dataset_wrapper_metadata_file_accessors` (baseline) | Kept | Pins single-dataset `all_metadata_files` and `serialize()` without rewriting. |
| `test_collection_wrapper_path_accessors_follow_compute_environment` | Kept, absorbed the next test | Fast red test of the wrapper's contract with `ComputeEnvironment`. Its nested case is not in the integration test, which uses a flat list. |
| `test_collection_wrapper_paths_leave_metadata_files_alone` | Merged into the test above | It passed on the base code, which never calls the compute environment, so it couldn't show the fix. Its assertions (`all_paths`, `data_style="paths"` and `get_all_staging_paths()` never call `input_metadata_rewrite`) now run inside the red test before `all_metadata_files` is read. |
| `test_dataset_wrapper_metadata_file_accessors_follow_compute_environment` | Dropped | Duplicate. The collection red test already goes through `DatasetFilenameWrapper.all_metadata_files` for each element. The integration test checks `SINGLE_ALL_METADATA_FILES` and `SINGLE_SERIALIZE_METADATA` against `$single.metadata.bam_index` under real Pulsar staging. |
| `test_dataset_wrapper_metadata_files_keep_paths_the_compute_environment_does_not_rewrite` | Dropped | Passed before and after the fix. The `None` fallback runs in every local-runner framework test that renders `all_metadata_files`, because `SharedComputeEnvironment.input_metadata_rewrite` returns `None`. `collection_input_paths` and `tool_provided_metadata_8` both do this. |

Mock and helper changes:

- **Baseline (fixup):**
  - The collection wrapper now gets the real `example_datatype_registry_for_sample()` instead of a `Mock` whose `get_datatype_by_extension` returned `None`. This means `get_all_staging_paths()` resolves `file_ext_export_alias` as it does in production. The registry is built once through a `functools.cache` helper, because each build takes about 0.7 s.
  - `_hda_at` no longer patches `get_file_name`. It uses a real `model.Dataset(external_filename=path)`. Only `get_metadata_file_paths_and_extensions` is still stubbed, because metadata files need an object store.
  - `_list_paired_wrapper` kept its signature, so the intermediate commits still pass.
- **`StagingComputeEnvironment`:** now a dataclass that records metadata rewrites. Its `rewrite_metadata` switch went away along with the `None` test that used it. The existing `MockComputeEnvironment` doesn't fit here, because it returns one fixed path for every dataset.

Integration test `test/integration/test_pulsar_embedded_rewrite_parameters.py`:

- The hand-built fetch payload is gone. The single BAM comes from `dataset_populator.new_bam_dataset`, and the list from `DatasetCollectionPopulator.upload_collection` inside a small `_upload_bam_list` helper.
- `run_tool` + `wait_for_job` + `get_history_dataset_content` became `describe_tool_execution(...).assert_has_single_job.with_output(...)`. That call also checks the job ended `ok`.
- The per-key count expression (`2 if key.startswith(("FOR", "COLL")) else 1`) became an explicit `(key, count)` table.
- Assertions are unchanged. No raw HTTP calls were used before or after.
- Kept as an integration test, because it needs a job config (embedded Pulsar with `rewrite_parameters: true`). The existing `rewrite_parameters` tests need AMQP.

Framework tool `test/functional/tools/collection_input_paths.xml`: unchanged. The `<tests>` block is a smoke check that passes before and after the fix, since the local runner doesn't rewrite paths. Its job is to keep the tool the integration test depends on working in framework CI. `has_line_matching` can't compare one output line with another, so the real comparisons stay in the integration test.

E2E: none needed. Nothing in this change is visible in the UI.

## Red/green

I checked these in a temporary worktree at `origin/release_26.2`, which I removed afterwards:

- The baseline tests from the rewritten `Baseline tests` commit pass on the base code: 36 passed.
- With the branch's test file on the base code, only `test_collection_wrapper_path_accessors_follow_compute_environment` fails. It fails at its first assertion: `/galaxy/forward.dat` != `/job/inputs/forward.dat`.
- The integration test on the base code fails at the `ALL_PATHS` assertion: the path is in the object store instead of `pulsar_staging/<job>/inputs/`.

## Results at head

- `test/unit/app/tools/test_wrappers.py`: 37 passed.
- Integration `test_pulsar_embedded_rewrite_parameters.py`: 1 passed (34 s).
- Framework `collection_input_paths`, `inputs_as_json_with_paths`, `inputs_as_json_with_staging_paths`, `export_remote`, `tool_provided_metadata_8`: 6 passed.
- ruff, black and isort are clean on the changed files. mypy on the integration file only reports the strict-mode untyped-def notes that the original version also had.
