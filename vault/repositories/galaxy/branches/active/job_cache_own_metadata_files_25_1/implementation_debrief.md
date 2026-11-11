# Implementation debrief

STATUS: BLOCKED on a scope decision. The second scope evaluation recommends one more small addition. Under the workhorse process that parks the branch for John instead of starting another re-scope. The branch as it stands is a sound fallback.

```
hardening @ ff28c6828a98 vs origin/release_25.1 (merge-base e631e8fb37e3)
since 20261111T174513Z-implementation-654f397da8cd:
  commits: 3 same, 0 rebased, 0 changed, 9 new, 0 dropped
  hunks:   3 carried, 4 changed, 6 new, 2 dropped
```

## What the branch does

Targets `release_25.1`, the oldest supported release; the code is on every release from 25.0 to dev. There's no upstream issue. The approach, copying metadata files rather than reference counting or changing pgcleanup's purge rule, was agreed with mvdbeek (per John).

An output copied from another output now owns its metadata files instead of referencing the other HDA's `metadata_file` rows, which pgcleanup removes when it purges that HDA:

1. **Job cache, both entry points:**
   - The submission search in `DefaultToolAction` uses the `metadata` setter instead of assigning `_metadata`.
   - `HDA.copy_from(include_metadata=True)` copies through the setter after setting the extension and dataset. `FileParameter.make_copy` needs both. Before the reorder it would have checked the empty placeholder Dataset and silently dropped the index.
   - `copy_from` also covers cached collection elements, tool outputs that copy an input (the expression-tool passthrough), and attached deferred materialization.
2. **In-place deferred materialization** that reuses an existing dataset (workflow scheduling) copies the replacement's metadata files. This came from the re-scope.
3. **`make_copy`** sets `object_store_id` and flushes each new row before writing its file. Under `store_by: id`, `get_file_name()` used to commit the session to get an id, which released `Job.copy_from_job`'s row locks. The flush also lets copies of an HDA find its new rows by id, and it made the old commit-and-retry fallback unreachable, so that was removed.

Detached deferred materialization has no session and is never saved, so it keeps referencing the source's metadata.

## Scope decision for John

The second evaluation (`scope_evaluation.md`) recommends adding a `HistoryDatasetAssociation.purged == false()` filter to `get_replacement_dataset` (`lib/galaxy/model/dereference.py`), with a unit test on the existing `_deferred_bam_with_replacement` fixture.
- **Why:** a probe shows a purged replacement HDA whose Dataset is still alive gets reused. The in-place copy then produces an empty `bam_index`, and `metadata_deferred = False` means it's never regenerated.
- **Context:** release_25.1 has the same gap (it referenced a purged row), so this isn't a regression.

If declined, note the gap in the PR or file it separately. Both evaluations kept out:
- repairing rows already shared by past cache hits;
- the `MetadataFile.update_from_file` cache-sync saving (a separate `dev` PR);
- moving cache-hit copies off the request path.

## History to adopt before a PR

`job_cache_own_metadata_files_25_1_refactor_baseline_2` (local, `ce0cb6ba9bc`) holds the same tree as the branch tip (`c67d594fdc6`) in 10 commits. The baseline tests come first, then the `make_copy` flush prep, the job cache fix, tests, the in-place fix, and tests. The cancelled-out changes are dropped. Adopting it needs the branch moved and force-pushed, which is John's call. The older local `job_cache_own_metadata_files_25_1_refactor_baseline` is stale.

## Still valid if the scope changes

- Every debrief at the top level, from the re-hardening round. `earlier_drafts/1/` holds the first round.
- Tests: each new test fails on `release_25.1`, and line-level reverts map to the tests that catch them.
- Results at `ff28c6828a9`:
  - Unit (`test/unit/data/model/`, `test_model_copy`, `test_dataset_materialization`, `test_galaxy_mapping`): 303 passed.
  - Integration (job cache, metadata copy, materialization, workflow scheduling): 27 passed.
  - API cache, deferred and materialize tests: 45 passed.
  - `test_scripts_pgcleanup.py` on Postgres 16: 9 passed.
  - `make format` and mypy are clean.

## Validation that remains

- Not run: remote or caching object stores, `extended_celery`, linked library datasets imported into a history. Cached collection elements and detached materialization with a metadata file have no direct test.
- Cost per cache hit with file metadata: about 1 INSERT plus 4–5 object store calls per file, inside the API request at submission. For a large mapped-over BAM collection on a remote store, that's thousands of calls. Flag it in the PR description.
- If the shared dataset's `exists()` fails, the copy gets no index where it used to share one.
- Rows already shared by past cache hits aren't repaired. A new hit from such a source can copy an empty file.

## Noted, not this branch

- `MetadataFile.update_from_file` cache sync: saves 1 HEAD and 1 GET per metadata write on caching stores; a `dev` PR.
- In attached materialization without a replacement, metadata files are copied and then regenerated. That's wasted work, but rare, since deferred sources seldom have file metadata.

## Process notes

- The fork's `job_cache_own_metadata_files_25_1` is at `ff28c6828a9`. `..._alt_original_scope` is at `da18684880d`.
- Codex reviewed pasted code only, because its sandbox can't run on this host. The first run defaulted to effort `none`, so it was rerun at `high`.
- No issue comment, because there's no upstream issue.
