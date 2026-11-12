Fix - job cache outputs share the source HDA's metadata file rows, so pgcleanup purging the source deletes the BAM index the cached output still reads.

| On `release_25.1`, after `pgcleanup purge_deleted_hdas` purges the source | Before | After |
| --- | --- | --- |
| Job cache hit at submission (`DefaultToolAction`) | ❌ cached output's index file removed | ✅ output owns a copy |
| Job cache hit at job preparation (`Job.copy_from_job` → `copy_from`) | ❌ removed | ✅ owns a copy |
| Tool output copied from an input (expression tools, `copies` of the target) | ❌ removed | ✅ owns a copy |
| Deferred input materialized in place from a reused dataset (workflow scheduling) | ❌ removed | ✅ owns a copy |
| Deferred input whose reusable dataset was already purged | ❌ reused with an empty index, never regenerated | ✅ purged HDA isn't reused |

`HDA.copy_from(include_metadata=True)` and the early cache search assign `_metadata` raw, so the copy names the source HDA's `MetadataFile` rows. pgcleanup removes metadata files by `metadata_file.hda_id` when it purges an HDA, so purging the source deletes the file the cached output reads. `MetadataFile.get_file_name()` then recreates it empty: ***the cached output still shows OK, and the loss only surfaces when a later job or visualization reads a missing or empty index.*** ***On `release_25.1` the new Postgres test runs a real cache hit and `pgcleanup purge_deleted_hdas`, and without the fix the cached output's index reads back empty.*** It was first reproduced on `dev`.

Every persisted path that shared rows now goes through the `metadata` setter, which copies each file into a row the new HDA owns - the path `HDA.copy()` already takes. ***pgcleanup is unchanged; this stops cached and copied outputs from depending on rows another HDA owns.*** ***Rows already shared by past cache hits aren't repaired.*** Only new copies are fixed.

<details><summary>How it works</summary>

- **Job cache:** `copy_from` assigns metadata through the setter, after `self.dataset` is set, because `FileParameter.make_copy` only copies when the target dataset exists. The early cache search in `tools/actions` swaps its raw `_metadata` assignment for the setter.
- **Deferred materialization:** attached materialization copies; detached materialization still shares `_metadata`, because a detached instance has no session and is never persisted. The in-place `replacement_dataset` branch copies through the setter.
- **`get_replacement_dataset`** skips purged HDAs. pgcleanup purges an HDA's metadata files while its Dataset lives on, so a purged replacement handed over an empty index that `metadata_deferred = False` then kept from being regenerated. This also covers the not-in-place `copy_from(replacement)` path.
- **`FileParameter.make_copy`** sets the copy's `object_store_id` up front. Under `store_by: id` it flushes the new row to get an id, instead of `get_file_name()` committing the caller's session mid-copy; under `store_by: uuid` nothing is flushed, so an output not yet in a history isn't written early. The dead `except AssertionError` retry goes too.
- **`MetadataFile.update_from_file`** asks for its path with `sync_cache=False`. On caching object stores the synced call downloaded the new, empty object only to replace it, a HEAD and a GET per metadata file written. The sync also created the object's cache directory, so `_caching_base._update_from_file` now creates it, as rucio already does.

</details>

***The last commit (cache sync) is a performance change to every metadata file write on caching object stores, included because each cache hit now writes copies; it splits off cleanly if reviewers prefer it separate.***

## Risks

***Risks are mostly two-way for a release branch: no schema, API or tool-facing change, but each cache hit and in-place materialization now writes its own metadata files.***

<details><summary>Risk Details</summary>

- Per cache hit or replacement materialization with file metadata: about 1 INSERT plus 3–4 object store calls per metadata file, plus a GET when the source isn't cached. Cache hits at submission pay this inside the API request. Most datatypes have no file metadata; BAM has one.
- Under `store_by: id`, a cache hit at submission now flushes the output before it joins its history, to give the copied row an id. The base never copied there. Galaxy's strict historyless-HDA test check runs only with `store_by: uuid`, so CI doesn't exercise this case.
- The cache-sync change touches every metadata file write on caching object stores. It was checked against a dict-backed boto3 store in a unit test, not against a real remote store.
- A purged HDA is no longer reused as a deferred input's replacement, so that input is fetched again from its source.
- Rows shared by cache hits made before this change stay shared and stay exposed to pgcleanup.

</details>

<details><summary>Risk Review Advice</summary>

Check that every remaining raw `_metadata` assignment is intended: the detached materialization branch in `deferred.py` is the only one the branch keeps, and its comment says why.

In `FileParameter.make_copy`, check the flush condition. Under `store_by: id`, `MetadataFile.get_file_name()` needs an id for the path; under `store_by: uuid` it doesn't, and flushing there writes an output HDA before it joins its history, which Galaxy's `GALAXY_TEST_RAISE_EXCEPTION_ON_HISTORYLESS_HDA` tests reject.

`get_replacement_dataset` filters `purged`, not `deleted`: a deleted but unpurged HDA still has its metadata files, and the materialized input now owns copies, so a later purge doesn't reach it.

</details>

## Context

The shared-row hazard was reproduced on `dev` while reviewing 🔀 #24745, and found while working on 🎯 #24787, whose `metadata_source` fix touches `FileParameter.make_copy` too. The copy approach was agreed with mvdbeek; changing pgcleanup to tie metadata file lifetime to the Dataset, and reference counting rows (needs a migration), were rejected. Alternative kept on 🌿[`job_cache_own_metadata_files_25_1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/job_cache_own_metadata_files_25_1_alt_original_scope) - the job cache fix only, leaving in-place deferred materialization sharing the replacement's rows. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Expanded once more: skip purged HDAs in <code>get_replacement_dataset</code>.</summary>

The re-scope made in-place materialization copy the replacement's metadata files, which is only sound while the replacement still has them; a probe showed a purged replacement handing over an empty, never-regenerated index. Not recommended and kept out: repairing rows shared by past hits (a data repair), moving cache-hit copies off the request path (a design change), and the cache-sync saving (later included at John's request as the last commit). Splits naturally into baseline tests, the `make_copy` prep, the job cache fix and the materialization fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/scope_evaluation/). Run via Claude Opus at medium effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests first, then the <code>make_copy</code> flush prep as its own commit before the fix.</summary>

The baseline commit pins today's row sharing and the pgcleanup loss; the fix commits flip those asserts. Not split out: the `copy_from` reorder (only the fix needs it), the `source_instance` local, and the in-place change (a behavior fix, kept as its own commit).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/baseline_refactor/). Run via Claude Opus at medium effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added a materialization-from-replacement test and shared fixtures; every test fails without its change.</summary>

With all `lib/` changes reverted, each unit test fails at its own ownership, rollback or statement-count assert, the four SQLite integration tests fail at the ownership assert, and both Postgres pgcleanup cases fail with `b'' == b'BAI...'`. Single-line reverts fail only the test pinning that line. Integration tests need `self._app` because metadata file ids aren't exposed by the API, and only pgcleanup removes metadata files. Gaps: detached materialization with a metadata file, and cached collection elements. Run at `ff28c6828a9`; the tests of the three later code commits were each checked to fail without their change while polishing.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/test_challenges_debrief/). Run via Claude Opus at medium effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>No code changes; every added cost comes from the agreed copy-not-share design.</summary>

Measured per copied file on the in-place path: +2 SELECT, +1 INSERT, +1 HDA UPDATE and history row, and +4 object store calls, with no `UPDATE metadata_file`. In-place materialization runs in the workflow scheduler thread, not a request. It flagged the `update_from_file` cache sync as a follow-up, since added as the last commit.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/performance_challenges_debrief/). Run via Claude Opus at medium effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings at <code>ff28c6828a9</code>, before the last three code commits.</summary>

Reviewed the diff and excerpts of every caller and pgcleanup's purge paths. The later commits (purged filter, cache sync) had their own review, which found only the cache directory issue fixed in the cache-sync commit; the `store_by` flush fix came from fork CI. The earlier round's only finding (a linked BAM losing its index) was refuted by a probe and is pinned by `test_expression_tool_output_copied_from_linked_input`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression at <code>ff28c6828a9</code>; the fix deletes bespoke row sharing in favor of the existing setter.</summary>

Declined: merging `deferred.py`'s two metadata branches into one (more concepts for the reader), moving the share-or-copy choice into `copy_from` (hides a session-dependent mode), and routing in-place materialization through `copy_from` (would also copy `info`, `peek` and tags). No file crosses a size threshold.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/thermo_nuclear_review/). Run via Claude Opus at medium effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 6 general and 3 workflow items pass.</summary>

- [x] What does the user see when it fails? A cached output, or a workflow input materialized in place from a reused dataset, silently loses its BAM index once the source HDA is purged; a later tool or visualization then fails on a missing or empty index.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check rows, files, bytes, rollback and object store downloads; one statement-count test pins the insert-once property on purpose.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes for the core fix (`a23a1b96991`); later fixes ship their tests in the same commit, and each fails without its fix.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Runs that hit the job cache or materialize deferred inputs in place now copy metadata files instead of sharing them; outputs are unchanged. A purged HDA is no longer reused as a replacement.
- [x] Who hits this in practice and what is the evidence? Servers using the job cache and pgcleanup `purge_deleted_hdas`, for datatypes with file metadata such as BAM. Reproduced on `dev` with a real cache hit.
- [x] Were simpler or existing approaches considered? Yes. Tying metadata file lifetime to the Dataset in pgcleanup (a workaround) and reference counting (needs a migration) were rejected; the fix reuses `HDA.copy()`'s setter path.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_cache_own_metadata_files_25_1/pr_checklist/). Run via Claude Opus at medium effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Integration (`test/integration/test_job_cache_metadata_files.py`): cache hits at submission and at job preparation, and expression-tool outputs copied from an uploaded and a linked BAM, each owning its own `bam_index` row and file.
- Integration, Postgres (`test/integration/test_scripts_pgcleanup.py`): `purge_deleted_hdas` on the source keeps the cached output's index bytes, for both cache paths.
- Unit (`test/unit/data/test_model_copy.py`): `copy_from` gives the target and its copies their own files, leaves the transaction to the caller, inserts each row once, doesn't flush an output not yet in a history, and writes metadata files on a caching store without downloading them.
- Unit (`test/unit/data/test_dataset_materialization.py`): in-place and copied materialization from a replacement own their index, and a purged HDA isn't used as a replacement.
- The baseline commit comes first and pins today's sharing.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
