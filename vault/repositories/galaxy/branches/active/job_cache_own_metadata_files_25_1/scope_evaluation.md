Run via Claude Opus at medium effort.

# Scope evaluation (after the re-scope)

**Recommendation: expand slightly, one more time.** Add a `HistoryDatasetAssociation.purged == false()` filter to `get_replacement_dataset` (`lib/galaxy/model/dereference.py`), plus a unit test built on the existing `_deferred_bam_with_replacement` fixture. The re-scope made in-place materialization copy the replacement's metadata files. That copy is only sound if the replacement still has its files. A probe on this branch shows it doesn't when the replacement was purged: `get_replacement_dataset` picks a purged replacement whose Dataset is still alive, the materialized input gets an empty `bam_index`, and because `metadata_deferred` is set to `False` it is never regenerated. Release_25.1 has the same gap, so it isn't a regression. It is a one-line, related bug at the source of the copy this branch now relies on. Keep everything else out: repairing rows shared by past cache hits (a data repair), the `MetadataFile.update_from_file` cache-sync saving (it touches every metadata write; a separate `dev` PR), and moving cache-hit copies off the request path (a design change).

## Possible Decompositions

The branch has about 30 changed lines in `lib/` and about 260 in tests. `baseline_refactor.md` has already rebuilt the history on `job_cache_own_metadata_files_25_1_refactor_baseline_2` (its tree is identical to the tip):

1. **Baseline tests** (`a23a1b96991`). They pin today's row sharing and the pgcleanup loss.
2. **`FileParameter.make_copy` flush prep** (`91b79fe8603`). It sets `object_store_id`, flushes instead of committing under `store_by: id`, and drops the dead retry. This fixes `HDA.copy()`'s existing path on its own and could carry the statement-count test.
3. **Job cache fix and its tests** (`520ac7a8db0` through `6123341aca7`). This covers the `copy_from` reorder plus the setter, the `tools/actions` setter swap, and the attached and detached split in `deferred.py`.
4. **In-place deferred materialization fix** (`603233d9839` through `ce0cb6ba9bc`). If the recommended `get_replacement_dataset` filter is added, it goes here or directly after it.

Natural groupings: one PR (1 to 4); PR A = 1 + 2 with PR B = 3 + 4; or 1 + 2 + 3, followed by 4 (with the filter) as a small materialization PR. The order is 1, 2, 3, 4 in every case.

## As implemented

Every path that gave an HDA another HDA's `MetadataFile` rows now copies the files through the `metadata` setter: cache hits at submission and at job preparation, the `copies` loop, the expression-tool passthrough, attached non-in-place materialization, and (since the re-scope) in-place materialization with a replacement. Detached materialization still shares, because nothing persists it. `make_copy` flushes instead of committing mid-copy.

| Pros | Cons |
|---|---|
| - Fixes the pgcleanup data loss on both cache paths and on the workflow-scheduling materialization path.<br>- Uses the existing canonical setter (`HDA.copy()`'s path). There is no new abstraction and no migration, and mvdbeek agreed to the approach.<br>- Four reviews this round found nothing to change. Tests fail without the fix on SQLite (id and uuid) and Postgres. | - In-place materialization can still copy from a purged replacement and silently end up with an empty index (pre-existing, confirmed by probe).<br>- Rows already shared by earlier cache hits stay shared.<br>- Adds per-file object store I/O to every cache hit and replacement materialization that has file metadata. |

## Expansion A (recommended): `get_replacement_dataset` skips purged HDAs

Add `HistoryDatasetAssociation.purged == false()` to the `existing_dataset_select` filters in `dereference.py`. Add a unit test: mark the fixture's replacement purged, remove its index file, materialize in place, and assert the replacement isn't reused (the input then materializes from its source).

| Pros | Cons |
|---|---|
| - It's at the source of the copy the re-scope added. Without it, the re-scope's guarantee ("purging the replacement keeps them") holds only if the replacement wasn't purged before the lookup.<br>- One line, plus a test that reuses `_deferred_bam_with_replacement`. Safe on a release branch: a purged HDA is never a sensible replacement, and the caller falls back to normal materialization.<br>- Brings the lookup in line with the job cache search, which already excludes jobs with deleted outputs (`_exclude_jobs_with_deleted_outputs`).<br>- Applies to every datatype, not just BAM: a purged replacement is also a poor source for `info`/`peek` in the non-in-place `copy_from`. | - `dereference.py` isn't otherwise touched by the branch, and the bug predates it. On base, the result was a dangling reference, which was just as broken.<br>- It changes materialization behavior in one case (a purged replacement now triggers a re-fetch instead of reuse). That is correct, but reviewers may ask whether `deleted` should be filtered too. |

<details>
<summary>Details</summary>

Probe (scratchpad, not committed): `_deferred_bam_with_replacement`, then set `replacement.deleted = replacement.purged = True` and remove its `bam_index` file, as `pgcleanup purge_deleted_hdas` does while the Dataset stays alive. Then `materializer_factory(True).ensure_materialized(deferred, in_place=True)`. Result: `materialized.dataset is replacement.dataset` is `True` and the copied index reads `''`. `MetadataFile.get_file_name()` creates an empty object when the source file is missing, so `make_copy` doesn't fail. It writes an empty file and moves on, and the early `replacement_dataset` return skips metadata regeneration.

Filter only `purged`, not `deleted`. A deleted but unpurged HDA still has its metadata files, and with this branch the materialized instance owns its own copy, so a later purge of that HDA is harmless. Filtering `deleted` too would be defensible but needlessly conservative.

</details>

## Expansion B (not recommended): repair rows already shared by past cache hits

An admin script or migration that finds HDAs whose `_metadata` names `MetadataFile` rows owned by another HDA, copies those files into rows it owns, and reports HDAs whose files are already gone.

| Pros | Cons |
|---|---|
| - Protects existing instances. A cache hit made before the upgrade stays exposed, and so do new hits whose source is such a copy: the branch copies from a row whose file may already be gone. | - It's a data repair. Detecting shared rows means parsing `_metadata` JSON for every HDA with file metadata, which isn't release bug-fix material.<br>- Files already removed can't be recovered, only regenerated with set_metadata.<br>- A dev-targeted admin script, or release notes advising caution with `purge_deleted_hdas`, is the right vehicle. |

## Expansion C (not recommended): restore the `MetadataFile.update_from_file` cache-sync saving

Re-apply `get_file_name(sync_cache=False)` in `update_from_file`, which saves 1 HEAD and 1 GET per metadata file write on caching stores.

| Pros | Cons |
|---|---|
| - A measured win for every metadata file write on caching stores, including the copies this branch adds. | - It changes every metadata write on every caching store, which is unrelated to the bug. It was backed out (`5b4fc0295bd`) for that reason.<br>- It belongs in its own `dev` PR with an object store test. |

## Expansion D (not recommended): move cache-hit metadata copies off the request path

Defer submission-time copies to the job handler or a celery task, so that 1000 cached BAM elements on a remote store don't do about 5–7k object store calls inside one API request.

| Pros | Cons |
|---|---|
| - Removes the worst-case latency the fix adds for large mapped-over BAM collections on remote stores. | - It's a design change: the early cache search exists so outputs are ready at submission. It needs upstream discussion.<br>- The cost is inherent to the agreed copy design, and `HDA.copy()` already pays it. Most datatypes have K = 0 file metadata.<br>- The re-scoped in-place path runs in the scheduler thread, not a request, so it doesn't add request latency. |

<details>
<summary>Details</summary>

Flag the per-hit cost in the PR description: about 1 INSERT plus 4–5 object store calls per metadata file, and a GET when the source isn't cached. Then reviewers can ask for a follow-up. The two cache paths are exclusive, so nothing is copied twice.

</details>

## Contraction (not recommended): drop the re-scope, ship `alts/original_scope.md`

Revert to `job_cache_own_metadata_files_25_1_alt_original_scope`, which leaves in-place materialization sharing the replacement's rows.

| Pros | Cons |
|---|---|
| - Slightly smaller diff, and no object store I/O added to workflow scheduling. | - It leaves the same bug in the same `if/elif` the branch already edits, on a path workflow scheduling reaches in production.<br>- The re-scope is one line plus a test, and every review this round accepted it. |

## Other observations (not scope candidates)

- The job cache search already excludes jobs with deleted outputs, so a cache hit never copies from a purged source HDA directly. The purged-source gap exists only in `get_replacement_dataset`.
- Attached non-in-place materialization copies the files and may then regenerate them. That I/O is wasted, but avoiding it changes the `has_metadata_files` decision. It is rare in practice and out of scope, as both reviews concluded.
- Detached materialization still shares `_metadata` by design, and that has no test. It is a test gap, not a scope question.
