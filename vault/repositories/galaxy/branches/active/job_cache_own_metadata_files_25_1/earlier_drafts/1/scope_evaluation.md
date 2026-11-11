Run via Claude Opus at medium effort.

# Scope evaluation

**Recommendation: expand modestly.** Add one thing: in-place deferred materialization (`deferred.py`, `elif replacement_dataset:`) should copy the replacement HDA's metadata files through the `metadata` setter, the way every other `copy_from(include_metadata=True)` path on this branch now does. Add a test for it. It is the same bug as the branch fix, in a function the branch already edits, and the fix is about one line. It should go to release_25.1 with the rest. Keep everything else out: repairing rows already shared by past cache hits, the backed-out `MetadataFile.update_from_file` cache-sync saving, and moving cache-hit copies off the request path. Each of those is a different kind of change (a data repair, a cross-cutting performance change, a design change), not a related bug in the code this branch touches.

## Possible Decompositions

The branch adds about 30 lines in `lib/` and about 200 in tests. `baseline_refactor.md` already restructures the history on `job_cache_own_metadata_files_25_1_refactor_baseline` so that it splits cleanly:

1. **Baseline tests.** These pin today's sharing behavior and the pgcleanup loss. This could land alone, or together with 2.
2. **`FileParameter.make_copy` flush prep.** Set `object_store_id`, flush the new row instead of committing under `store_by: id`, and drop the dead retry. It is a standalone fix to `HDA.copy()`'s existing path, and the query-count unit test can travel with it.
3. **Job cache fix.** This covers `copy_from` reordering plus the setter, the `tools/actions` setter swap, and the attached and detached split in `deferred.py`. If the in-place deferred fix is added, it goes here too. The integration and pgcleanup tests come with it, plus the expression-passthrough and linked-input tests.

Either PR A = 1 + 2 and PR B = 3, or a single PR. Order is 1, then 2, then 3.

## As implemented

Cached outputs, at submission and at job preparation, now copy their metadata files into rows they own. So do attached non-in-place deferred materialization, the expression-tool passthrough, and the `copies` loop. Detached materialization keeps the raw `_metadata` share, because nothing persists it. The `make_copy` flush stops a mid-copy commit under `store_by: id`.

| Pros | Cons |
|---|---|
| - Fixes the reported data loss (pgcleanup purging a source removes the cached copy's index) on both cache paths.<br>- Routes through the existing canonical setter (`HDA.copy()`'s path). There is no new abstraction and no migration, and mvdbeek agreed to the approach.<br>- Small enough for release_25.1, and well tested on SQLite (id and uuid) and Postgres. | - Leaves a sibling path in the same function sharing rows: in-place deferred materialization with a replacement.<br>- Rows already shared by earlier cache hits stay shared.<br>- Adds per-file I/O to every cache hit with file metadata. |

## Expansion A (recommended): in-place deferred materialization copies too

In `DatasetInstanceMaterializer.ensure_materialized`, in the `elif replacement_dataset:` branch, after setting `dataset`/`dataset_id`, replace `materialized_dataset_instance._metadata = replacement_dataset._metadata` with `materialized_dataset_instance.metadata = replacement_dataset.metadata`.

| Pros | Cons |
|---|---|
| - Same bug class, in the function the branch already changed. Without it, the branch leaves two different behaviors in the same `if/elif`.<br>- This branch only runs attached: `replacement_dataset` is set only when `attached`, through `get_replacement_dataset`. The setter has a session, and the extension matches because `get_replacement_dataset` filters on it. So the change needs no new branching.<br>- It's reachable in production. Workflow scheduling materializes deferred inputs with `in_place=True` (`scheduling_manager.py:396`), and a replacement is found whenever the same URL or hash was already materialized for that user.<br>- `replacement_dataset` returns early, before metadata regeneration, so the shared rows are never replaced later. Purging the replacement HDA removes the index from the materialized workflow input. | - No existing test reaches the replacement path, and the existing deferred fixtures are bed files with no `MetadataFile`. A test needs a BAM-with-index replacement, either a unit test against the materializer or an integration test with two materializations of the same deferred BAM.<br>- It's one more `copy_from`-style cost (one `exists()`, one read, one write per file) on each in-place materialization that has a replacement. That's still cheaper than the re-stream it replaces. |

<details>
<summary>Details</summary>

In the in-place case, `materialized_dataset_instance` is the deferred HDA itself. Its own prior `_metadata` came from a deferred dataset, so it had no file metadata of its own. Overwriting it orphans nothing. Under `store_by: id` the setter's `make_copy` flushes, and that needs a session. Session-ness holds, because the `if attached:` block above it adds `materialized_dataset_instance` to `sa_session`. `make_copy` also requires `target_dataset.object_store.exists(target_dataset)`. Here `target_dataset` is `replacement_dataset.dataset`, which is a real, populated dataset, so the copy happens. Order matters in the same way as in `copy_from`: set the dataset first, then the metadata. The existing two lines already do that.

A unit-level test can follow `test_deferred_hdas_basic_attached` in `test/unit/data/test_dataset_materialization.py`. First materialize a deferred BAM attached (or seed an HDA whose dataset carries matching sources or hashes and a `bam_index` `MetadataFile`). Then materialize a second deferred HDA with the same source `in_place=True`. Then assert that the two `bam_index` rows differ and that the bytes match. If faking `get_replacement_dataset` matching proves heavy, an integration test that runs a workflow twice on the same deferred BAM URL is the fallback.

</details>

## Expansion B (not recommended): repair rows already shared by past cache hits

Ship a script or migration that finds HDAs whose `_metadata` names `MetadataFile` rows owned by another HDA. It would copy those files into rows the HDA owns, and report HDAs whose files are already gone.

| Pros | Cons |
|---|---|
| - Protects existing instances, where every past cache hit on BAM or other indexed types is still exposed to pgcleanup. | - It's a data repair, not a code fix. Detection means parsing `_metadata` JSON for every HDA with file metadata, so it needs a migration or an admin script. That's poor fit for a release_25.1 bug-fix PR.<br>- Where pgcleanup already ran, the bytes are gone and can't be recovered. Repair can only regenerate them, by running set_metadata.<br>- The same exposure has existed on every release since cache hits started sharing rows. A separate, dev-targeted admin script, or release-notes guidance to skip `purge_deleted_hdas` until hits age out, is the right vehicle. |

## Expansion C (not recommended): restore the `MetadataFile.update_from_file` cache-sync saving

Re-apply `get_file_name(sync_cache=False)` in `update_from_file`. On caching remote stores, this saves 1 HEAD and 1 GET per metadata file write.

| Pros | Cons |
|---|---|
| - It's a measured win (`performance_challenges_debrief.md`): every metadata file write on caching stores drops from 4 calls to 3, including the ordinary set-metadata path. | - It changes every metadata write on every caching store, which has nothing to do with the bug. The coordinator backed it out for that reason.<br>- It's best as its own small `dev` PR, with an object store test, so reviewers judge it on its own terms. |

## Expansion D (not recommended): move cache-hit metadata copies off the request path

Defer copying metadata files for submission-time cache hits to the job handler (like late hits) or a celery task, so a mapped-over BAM collection on a remote store doesn't do N × (≈5–7) object store calls inside the API request.

| Pros | Cons |
|---|---|
| - Removes the worst-case latency the fix introduces: roughly 5–7k remote calls in one request for 1000 cached BAM elements. | - It's a design change. Outputs become usable at a different time, and the early cache search exists precisely so outputs are ready at submission. That needs upstream discussion.<br>- It isn't release material. The cost is inherent to the agreed copy design, and it matches what `HDA.copy()` already pays when a user copies datasets between histories.<br>- Most datatypes have no file metadata (K = 0), so the common case is unaffected. |

<details>
<summary>Details</summary>

The two cache paths are exclusive (`handler.py` calls `copy_from_job` without `copy_outputs`), so nothing is copied twice. The lock window in `Job.copy_from_job` covers only the new job's own fresh outputs, so a slow store lengthens the transaction without blocking unrelated work. Flag the latency in the PR description, so reviewers can choose to defer it as a follow-up. Don't change it here.

</details>

## Contraction (not recommended): fix only the late path, or only `copy_from`

Drop the `tools/actions` swap and the deferred changes, and fix only `HDA.copy_from`.

| Pros | Cons |
|---|---|
| - The smallest diff. | - The submission-time hit is the common cache path, and it would keep sharing rows, so the bug would stay reachable.<br>- The `deferred.py` attached change follows from `copy_from` anyway. Detached materialization would break without the compensating raw assignment, so it can't be dropped independently. |

## Other observations (not scope candidates)

- `replace_elements_with_copies` goes through `copy_from` and is fixed by it. The test challenge found that ordinary cached HDCAs share the source's `DatasetCollection` outright, so the cached output and the source are the same element HDAs. That's existing design, not this bug.
- The other `_metadata =` assignments in `lib/` don't share rows across HDAs: model store import, `HistoryDatasetAssociationHistory` snapshots, and `none_like`.
- The rejected alternatives (pgcleanup tied to the Dataset, reference counting) stay rejected per `index.md`.
