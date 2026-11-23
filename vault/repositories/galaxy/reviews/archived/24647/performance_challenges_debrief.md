# Performance challenges debrief: PR #24647

Profile: gx_performance_challenger (`_shared/reviewers/gx_performance_challenger.md`), claude-opus-5-5, medium effort. Reviewed commit `7247fea9983` against `origin/release_26.2`. Static review only; no Galaxy server or Postgres was run, so all cost estimates below are reasoned from the code, not measured.

## What the PR adds on the job-finish path

Only jobs using extended metadata are affected (`MinimalJobWrapper.finish`, `extended_metadata` branch).

1. `EditableObjects.__init__` runs once per finished job: `job.io_dicts(exclude_implicit_outputs=True)` plus a recursive walk of each output collection (`collection.elements`, `element.child_collection`, `element.hda/ldda`, `dataset_instance.dataset`).
2. `assert_editable` is a set lookup per edited object (no query), except `LibraryFolder` ids that are not job outputs, which call `_can_add_to_library_folder` (one `session.get`, a new `WorkRequestContext`, `library_folder_manager.can_add_item`).
3. `assert_metadata_file_editable` adds one `SELECT ... FROM metadata_file WHERE uuid = ?` per MetadataFile reference in imported metadata, then lazy-loads `history_dataset`/`library_dataset` on each matching row until one matches.
4. `assert_dataset_attributes_editable` is pure Python.

## Analysis

### Output collection walk (pattern: per-element N+1, #22361)

`_add_collection` lazy-loads `element.hda`/`element.ldda`/`element.child_collection` and `hda.dataset` per element, so a precreated output collection of N elements costs up to ~2-3 queries per element before the import starts.

Mostly a cost moved earlier, not added:
- Map-over cannot go quadratic. Every mapped job is linked to the whole implicit HDCA through `output_dataset_collection_instances`. But in `io_dicts(exclude_implicit_outputs=True)` the `output_dataset_collections` loop runs second and overwrites the same output name with the job's own sub-collection, so each job walks only its own slice. Plain dataset outputs of mapped jobs are excluded because their name is in `out_data`.
- Discovered collection outputs (split, fetch) are precreated empty, so the walk sees no elements.
- For precreated, populated collections (`structured_like`, static elements), the import already loads `dc.elements` (to clear them) and fetches each exported HDA by id. Many-to-one lazy loads by primary key hit the identity map, so the import's own fetches become cache hits after the walk. The net extra queries should be about zero. That would only change if the import ever stops loading those rows.

Not a finding. It is worth one query-count check (below) on a ~1k-element `structured_like` output, because that is the worst case.

### Duplicate uuid query in `replace_metadata_file` (pattern: redundant round trips)

With `editable_objects` set, every MetadataFile reference now runs two indexed queries on the same `uuid`: the unbounded one for the assertion, then the existing `ORDER BY id LIMIT 1` one. The rows from the first query already contain the row the second picks (the lowest id). `MetadataFile.uuid` is indexed and copies get fresh uuids (`metadata.py` `make_copy`), so each result is one row or a few. The cost is one extra indexed round trip per metadata file, plus a lazy load of `history_dataset` per existing row. A job that discovers thousands of datasets with metadata files (BAM `.bai`, etc.) pays thousands of extra cheap queries. That is a minor cleanup, not a scaling risk. Fix: run the query once, assert on the list, and reuse its minimum-id row.

### Library folder callback

This is called once per non-output `LibraryFolder` id in the store, only for top-level folder targets. Fetch requests name few folders, and the result is not memoized. This is negligible, so it is not a finding.

### Patterns checked and not applicable

There are no unbounded list queries, API endpoints, client polling, CTEs, fan-out joins, async handlers, or flush/commit loops. Nothing is added to a shared API response.

## Measurement plan (if anyone wants data)

1. Use a `test/unit/data/model/test_model_store.py`-style fixture on Postgres. Create a job with a 1,000-element `structured_like` output collection and export an extended-metadata store. Count statements with a SQLAlchemy `before_cursor_execute` listener around `perform_import`, with `editable_objects=None` and then with `EditableObjects(job)`. Expect the totals to be close to each other.
2. Run the same harness with 1,000 discovered datasets that each carry one MetadataFile. Expect about +1,000 `metadata_file` uuid selects with the restriction on. This confirms P3 1, and the counts should drop back after the fix.
3. Optionally run an API test (`test_tools_collections` map-over with a collection output, 500 elements) and compare the job finish timings logged by `finish()` before and after the change.
