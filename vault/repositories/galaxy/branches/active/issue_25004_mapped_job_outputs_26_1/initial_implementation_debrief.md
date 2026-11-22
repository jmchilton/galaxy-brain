# Initial implementation debrief

Implemented fix A from the [root-cause comment](https://github.com/galaxyproject/galaxy/issues/25004#issuecomment-7084444073) on `release_26.1`. Two commits, pushed to `jmchilton`.

```
created .../differential-review/snapshots/20261122T194318Z-implementation-07763ce5ac6c.json
  implementation @ 07763ce5ac6c vs origin/release_26.1 (merge-base ae0530e39340)
  first snapshot: 2 commits, 2 files, 2 hunks
```

## Commits

- `be6136f48d4` **Baseline tests for parameters_display job outputs.** `test_parameters_display` now checks the outputs for a `cat1` job, not just a 200 response. A new `test_parameters_display_collection_output` pins an unmapped `collection_creates_pair` job: one `paired_output` HDCA row plus its two element HDAs. Both pass on unmodified `release_26.1`.
- `07763ce5ac6` **Fix.** `_own_output_dataset_collection_instances(job)` in `lib/galaxy/managers/jobs.py` drops HDCA associations whose `implicit_collection_jobs_id` matches the job's `implicit_collection_jobs_association`. Only `summarize_job_outputs` uses it. Two regression tests: `cat1` mapped over a list, and `collection_creates_pair` mapped over a list (gives `list:paired`). Each job must show exactly its own datasets, and together the jobs must cover every element. Both tests fail without the fix: the implicit HDCA appears in each job's outputs.

## Choices

- **Filter at display, keep the association.** `ExecutionTracker.record_success` links every implicit HDCA to each mapped job, and job search, the job cache, `_user_can_access_job` and workflow extraction rely on that link. So the summary filters instead.
- **`/api/jobs/{id}/outputs` and `Job.to_dict` are unchanged.** `client/src/components/Tool/submit/submitAsync.js` reads `/outputs` to find the implicit collections a submission created.
- **Match on the ICJ id, not on output names.** `Job.io_dicts(exclude_implicit_outputs=True)` uses name matching, which misses mapped collection-output tools: the collection is named `paired_output`, but its datasets are named `paired_output|__part__|…`.

## Known limitations

- Jobs in imported histories still list the collection, because the model store doesn't export `HDCA.implicit_collection_jobs`. Other code that relies on that column has the same gap.
- A mapped collection-output job shows its element datasets but no collection row. Its own sub-collection is a plain `DatasetCollection`, which `JobOutputs` can't render. Before the fix, that row was the parent collection, which was wrong.

## Checks

- `pytest -p no:postgresql lib/galaxy_test/api/test_jobs.py -k parameters_display`: 4 passed. pytest needs `-p no:postgresql` because the host has no libpq.
- ruff, black and isort are clean. mypy on the changed files leaves only `jobs.py:883` (unused `type: ignore`), which is already on the base branch.
- [Normal review](subagents/normal_review.md): no blockers or should-fix findings.
