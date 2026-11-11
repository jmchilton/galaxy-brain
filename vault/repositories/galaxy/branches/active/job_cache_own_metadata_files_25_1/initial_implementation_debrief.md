# Initial implementation debrief

```
created .../differential-review/snapshots/20261111T174513Z-implementation-654f397da8cd.json
  implementation @ 654f397da8cd vs origin/release_25.1 (merge-base e631e8fb37e3)
  first snapshot: 3 commits, 6 files, 9 hunks
```

Targets `release_25.1`, the oldest supported release; the shared-row code is on every release branch from 25.0 to dev. There's no upstream issue. The approach, copying rather than reference counting or changing pgcleanup, was agreed with mvdbeek (per John).

## What changed

1. **Baseline tests** (`0459a61e593`) pinned the bug before the fix:
   - `test_job_cache_metadata_files.py`: on a cache hit at submission and at job preparation, the cached BAM output's `bam_index` is the source output's row.
   - `test_scripts_pgcleanup.py`: after `purge_deleted_hdas` purges the source, the cached output's index bytes are gone.
2. **Fix** (`08db94182d0`):
   - `HDA.copy_from(include_metadata=True)` copies through the `metadata` setter (`make_dict_copy`, then `FileParameter.make_copy`), as `HDA.copy()` does. It does this after setting `extension` and `dataset`: `make_copy` takes the spec from the target's datatype, and it copies only when the target's Dataset exists in the object store. Before the reorder, the target would have been the cached job's empty placeholder Dataset, and the index would have been silently dropped.
   - The early cache search in `DefaultToolAction` uses the setter instead of assigning `_metadata`.
   - Detached deferred materialization has no session and its instance is never saved, so it keeps the old raw assignment (`deferred.py`). Attached materialization now copies too.
3. **Review fix** (`654f397da8c`): `make_copy` flushes each new `MetadataFile` before writing its file. Under `store_by: id`, `get_file_name()` used to commit the session to get an id, which released `copy_from_job`'s row locks. Added a `store_by: id` test class.

`copy_from(include_metadata=True)` callers affected: `Job.copy_from_job` (the late cache search), cached collection elements (`replace_elements_with_copies`), tool outputs that copy an input (`tools/__init__.py`, the expression-tool passthrough), and attached deferred materialization. The new tests exercise only the first.

## Tests run

- New and pgcleanup tests: SQLite (uuid and id), and Postgres 16 in a local container. All pass.
- Regression:
  - Unit: `test/unit/data/model/`, `test_galaxy_mapping.py` and `test_dataset_materialization.py` (296 passed).
  - Integration: `test_job_cache.py`, `test_dataset_copy_metadata_files.py`, `test_materialize_dataset_instance_tasks.py` and `test_workflow_scheduling_options.py`.
  - API: the cache tests in `test_tools.py`, `test_jobs.py` and `test_workflows.py` (33 passed).
- Format and mypy are clean on the changed files.

## Open for hardening

- In-place deferred materialization (`deferred.py`, `elif replacement_dataset:`) still shares the replacement HDA's rows. It's the same class of bug, reached from workflow scheduling.
- Test gaps: cached collection elements, the `copies` loop, deferred, the expression-tool passthrough, and pgcleanup on the late path.
- Cost: each cache hit with file metadata now does an `exists()` plus a read and write per file, inside the API request at submission. If `exists()` fails, the cached output gets no index instead of sharing one.
- Rows already shared by earlier cache hits aren't repaired.
