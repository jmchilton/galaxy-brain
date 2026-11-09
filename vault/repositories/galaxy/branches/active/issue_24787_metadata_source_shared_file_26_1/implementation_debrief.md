# Implementation debrief

STATUS: BLOCKED on a scope decision. The second scope evaluation recommends two small additions, which under the workhorse process parks the branch for John instead of starting another re-scope. The branch as it stands is a sound fallback.

```
hardening @ 8c9d61351647 vs origin/release_26.1 (merge-base 1f3b0a8e7a82)
since 20261107T190839Z-implementation-68438838e686:
  commits: 6 same, 0 rebased, 0 changed, 5 new, 0 dropped
  hunks:   9 carried, 5 changed, 1 new, 2 dropped
```

## What the branch does

Targets `release_26.1`. The bug arrived with `807c53fc441` (via #23388, 2026-09-14). The first tag with it is `v26.1.2`; `v26.1.0` and `v26.1.1` don't have it. The test suite passes 12/12 on `release_25.1`, where the job side never received a collection's `metadata_source`.

1. **New outputs.** `FileParameter.make_copy` returns `None` for an id-less `MetadataFile` that another `Dataset` owns, so `set_meta` generates the output's own file, matching the `directory` strategy. It returns `None` rather than copying, because the copy path calls `object_store.exists()` on a Dataset with no id, which breaks discovery when a distributed store has a `store_by: id` backend.
2. **Outputs already affected, set metadata job.** `from_external_value` creates the dataset's own file instead of writing into a file another Dataset owns.
3. **Cleanup.** `pgcleanup.py` and `cleanup_datasets.py` keep a file while another live row names its uuid. On this base pgcleanup sets only `deleted`, so the guard checks `deleted` and `purged`, unlike #24745's guard. pgcleanup filters each removal batch with one query.

`_shares_dataset` compares Datasets, not instances: copies of a dataset keep sharing a file, and import clones match by Dataset id.

## Scope decision for John

The second evaluation (`scope_evaluation.md`) recommends:

- **Celery `set_metadata` task:** add `init_meta(copy_from=self)` before `set_meta`. Bulk "Change data type" with Auto-detect on an affected BAM reaches `Bam.set_meta` directly and still overwrites the input's index. This was shown in a scratch run of the task's `set_meta` step. Reachability through the full bulk operation is from reading the code, and the test layer isn't worked out.
- **`cleanup_datasets.py`:** `_delete_dataset`'s last `log.info(metadata_file.get_file_name())` recreates each removed file as 0 bytes. This predates the branch; the branch's test has a comment working around it.

If both are declined, record the Celery route as a known limit in the PR.

## Still valid if the scope changes

- Every hardening debrief at the top level, from this pass. `earlier_drafts/1/` holds the round before the re-scope.
- Every guard and check has a test that fails when it's removed. The one exception is the guards' `deleted` filter, which no committed test pins.
- Results at `8c9d6135164`:
  - Six integration files plus `test_scripts.py`: 134 passed, 2 skipped (SQLite).
  - `test_scripts_pgcleanup.py`: 11 passed (Postgres 16, local container).
  - Format is clean. mypy has no new errors on changed lines; the two test-file errors are on base lines.

## Validation that remains

- Not run: `extended_celery`, remote object stores, LDDAs on the separation path, CRAM.
- CRAM isn't repaired: re-detect gives it its own file but copies the input's index bytes, because `CRAM.set_meta` skips indexing when an index is set. Don't claim re-detect repairs CRAM.
- Before a PR, squash the commit churn: the guard went through three commits, and there are test cleanups.
- Codex saw the code only through the prompt (its sandbox can't run on this host) and didn't see the last two pgcleanup commits. The thermo-nuclear review did.

## Noted, not this branch

- Job cache: `HDA.copy_from(include_metadata=True)` makes a cached output reference the source HDA's row, so pgcleanup purging the source removes the file the copy reads. There's one row, so the uuid guard can't see it. No existing issue was found; queue one per `GX_QUEUING_ISSUE_CREATION.md` if wanted.
- `store_by: id` under `extended`: a BAM upload gets no index at all. A separate bug.
- Existing duplicate rows and overwritten indexes aren't bulk-repaired.

## Process notes

- The fork's `issue_24787_metadata_source_shared_file_26_1` is at `8c9d6135164`. The agent's force-push was denied; John ran it (2026-11-08).
- `..._26_1_alt_original_scope` holds the original scope, as the re-scope process requires.
- `..._26_1_wip` exists on the fork at `990a5f1bcd7` because of an unplanned push by the coordinator. It's not part of the process.
- The issue comment from `GX_PROCESS_RECORD_IMPLEMENTATION.md` was posted after the push: https://github.com/galaxyproject/galaxy/issues/24787#issuecomment-6720410530
