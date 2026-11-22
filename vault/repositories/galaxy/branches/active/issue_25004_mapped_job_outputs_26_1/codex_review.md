Run via gpt-6.2-sol.

Acted on both findings. Imported histories now keep the link from an implicit collection to its jobs, so the fix also holds there. The baseline test now checks the dataset endpoint for the job's output too.

Not acted on: nothing.

Codex's sandbox failed to start, so it reviewed the pushed branch on GitHub at `07763ce5ac6` without running tests. Both findings still applied to local HEAD.

## Details

### P2: imported mapped jobs still list the whole output collection (CONFIRMED, fixed)

`lib/galaxy/managers/jobs.py` `_own_output_dataset_collection_instances` matches the HDCA's `implicit_collection_jobs_id` to the job's ICJ. On import, `lib/galaxy/model/store/__init__.py` rebuilds the ICJs, the job-to-ICJ associations and the job-to-HDCA output associations. But `HDCA._serialize` never wrote `implicit_collection_jobs`, so the imported HDCA had a NULL ICJ and the filter kept it. The normal review had already flagged this as a known limitation. Codex rated it P2, which made two independent reviewers, so I fixed it at the source instead of adding a heuristic to the filter:

- `HistoryDatasetCollectionAssociation._serialize` exports `implicit_collection_jobs` as a store identifier.
- The new `ModelImportStore._import_collection_implicit_collection_jobs` runs after `_import_implicit_collection_jobs` and relinks the HDCA. It skips the link when the ICJ isn't in the store, which happens when its jobs weren't exported.

This also fixes other readers of `HDCA.implicit_collection_jobs` on imported histories. For example, `job_source_type` was `None` for an imported map-over collection.

Tests, in a new commit `b72810c2028` "Restore implicit collections' job links on history import":
- `test/unit/data/model/test_model_store.py::test_import_export_history_with_implicit_collection_jobs`: the imported HDCA links to the imported ICJ, and the ICJ's jobs are its elements' creating jobs. It fails without the store change (`assert None is not None`).
- `lib/galaxy_test/api/test_histories.py::ImportExportTests::test_import_export_map_over_collection`: maps `cat1` over a list, then exports and reimports the history. It checks that the imported HDCA has `job_source_type == "ImplicitCollectionJobs"` and that each element's job shows only its own `out_file1` in `parameters_display`. It fails without the store change.

### P3: baseline test fetches the job summary twice and only checks the dataset endpoint's status (CONFIRMED, fixed)

`test_parameters_display` now checks outputs on the job response it already has, and also on `/api/datasets/{output_id}/parameters_display`. The repeated value-mapping moved into a module-level `_output_values` helper. This was folded into the baseline commit (`8432a4fb470`), and the baseline tests still pass against base `jobs.py` and model code.

### Coverage notes from Codex

The local sandbox failed, so Codex reviewed the matching GitHub branch and couldn't run tests. Files reviewed: `managers/jobs.py`, `test_jobs.py`, `model/__init__.py`, `model/store/__init__.py`, `tools/execute.py`, `tools/actions/__init__.py`, `output_objects.py`, `api/jobs.py`, `services/jobs.py`, `schema/jobs.py`, `JobOutputs.vue`, `populators.py`, `collection_creates_pair.xml`.

### Checks after the changes

- `test_jobs.py -k parameters_display`: 4 passed.
- `test_histories.py::TestImportExportHistory::test_import_export_map_over_collection`: passed.
- `test/unit/data/model/test_model_store.py`: 48 passed, 1 xfailed.
- mypy over the changed files, diffed against base: one new error, the "ImportExportTests has no attribute" mixin error that `test_histories.py` already has 13 times.
