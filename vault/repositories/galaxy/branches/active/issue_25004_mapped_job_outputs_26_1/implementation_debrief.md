# Implementation debrief

**STATUS: READY.** The fix for [#25004](https://github.com/galaxyproject/galaxy/issues/25004) is hardened on `release_26.1`. Scope stays as implemented. Head `b72810c2028` is force-pushed to the fork (John approved), and the [workhorse note](https://github.com/galaxyproject/galaxy/issues/25004#issuecomment-7087637701) is posted on the issue.

```
created .../differential-review/snapshots/20261122T200604Z-hardening-b72810c20285.json
  hardening @ b72810c20285 vs origin/release_26.1 (merge-base ae0530e39340)
  since 20261122T194318Z-implementation-07763ce5ac6c:
    commits: 0 same, 1 rebased, 1 changed, 1 new, 0 dropped
    hunks:   1 carried, 1 changed, 6 new, 0 dropped
    changed 8432a4fb4709 Baseline tests for parameters_display job outputs (2 differing hunks)
    new     b72810c20285 Restore implicit collections' job links on history import
```

## Final implementation (6 files, +196/−1)

1. `8432a4fb470` **Baseline tests for parameters_display job outputs.** Pins the `parameters_display` outputs for a plain `cat1` job (on both the job and the output-dataset endpoints) and for an unmapped `collection_creates_pair` job. These pass on base code. Split this into its own PR if wanted.
2. `e824a289163` **Don't list the map-over collection as a mapped job's output.** `_own_output_dataset_collection_instances` in `lib/galaxy/managers/jobs.py` drops HDCAs whose `implicit_collection_jobs_id` is the job's own ICJ. Only `summarize_job_outputs` uses it. Regression tests map `cat1` and `collection_creates_pair` over a list.
3. `b72810c2028` **Restore implicit collections' job links on history import.** Codex found it and the normal review had flagged it: history export didn't record `HDCA.implicit_collection_jobs`, so on an imported mapped job the filter couldn't tell the collection apart and the bug came back. `HDCA._serialize` now exports the ICJ identifier, and `_import_collection_implicit_collection_jobs` relinks it after the ICJs are imported. This also gives imported map-over collections `job_source_type == "ImplicitCollectionJobs"` again. Tests: a model-store unit test, and an API export/reimport test that checks `parameters_display` on the imported jobs.

## Choices

- The job-to-implicit-HDCA association stays. Job search, the job cache, access checks and workflow extraction rely on it.
- `/api/jobs/{id}/outputs` and `Job.to_dict` `output_collections` are unchanged, because `client/src/components/Tool/submit/submitAsync.js` reads the implicit collections from `/outputs`.
- The import gap was fixed at the source (export/import of the link), not with a name or `implicit_output_name` heuristic in the filter.

## Scope decision

[Scope evaluation](scope_evaluation.md): **keep as implemented**. Its first pass recommended expanding to make `Job.io_dicts(exclude_implicit_outputs=True)` use the ICJ test instead of name matching. I challenged that with code evidence, and the evaluator agreed and revised. `io_dicts` already returns the right result for mapped collection-output jobs: the job's own sub-collection, recorded under the same output name, overwrites the implicit HDCA. The name rule has to stay to exclude shared DCs anyway, and switching only the HDCA half would leak the implicit HDCA into metadata setup and job-cache copying for jobs imported from older exports.

Follow-ups, not done here:
- A mapped collection-output job shows no row for its own sub-collection. `JobOutputs.vue` can't render a plain `DatasetCollection`, so this needs an API shape plus client work.
- Jobs imported from exports made before this fix still list the collection, because those archives have no link to restore.

## Hardening

- [Normal review](subagents/normal_review.md): no blockers.
- [Test challenges](test_challenges_debrief.md): no changes.
- [Performance](performance_challenges_debrief.md): no changes. Correction to that debrief: `JobToOutputDatasetCollectionAssociation.dataset_collection_instance` is mapped `lazy="joined"`, so the per-HDCA check adds no query. The only extra query is the job's ICJ association.
- [Codex review](codex_review.md): both findings fixed (the import link and a stronger baseline test).
- [Thermo-nuclear review](thermo_nuclear_review.md): approved with no changes.
- [Baseline refactor](baseline_refactor.md): none needed.
- Check branch: `make format` changed nothing. Diffed against base, mypy on the changed files adds only one more of the "ImportExportTests has no attribute" mixin errors that `test_histories.py` already has 13 of.
- Screenshots: skipped. No client code changes; the API tests check the exact payload the Job Outputs table renders.

## Test runs on the final head

- `lib/galaxy_test/api/test_jobs.py -k parameters_display`: 4 passed. The two map-over tests fail without the fix.
- `lib/galaxy_test/api/test_histories.py::TestImportExportHistory::test_import_export_map_over_collection`: passed; fails without the import fix.
- `test/unit/data/model/test_model_store.py`: 48 passed, 1 xfailed. The new test fails without the import fix.
- The baseline tests pass with `jobs.py` and the model code at base.
- Local pytest needs `-p no:postgresql`, because the host has no libpq.
