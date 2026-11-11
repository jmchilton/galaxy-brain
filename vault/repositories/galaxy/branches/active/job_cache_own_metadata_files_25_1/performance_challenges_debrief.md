Run via Claude Opus at medium effort.

# Performance challenges: job_cache_own_metadata_files_25_1 (after the re-scope)

## Top line

I made no code changes and no commits. The re-scope adds a per-file metadata copy to in-place deferred materialization, which runs during workflow scheduling. I measured it, and every extra cost comes from the agreed copy-not-share design. The copy pays for one DB row, one flush, one source read and one object write per file. The fix that is already on the branch (`1bfa20d298c`, which sets `object_store_id` before the flush) also covers the new path, so there is no `UPDATE metadata_file`. I found nothing avoidable that belongs on this branch.

Not acted on:
- **`MetadataFile.update_from_file` cache sync.** It downloads the just-created empty object on caching stores. This was backed out in `5b4fc0295bd` as too broad for release_25.1. It is a follow-up for `dev`, not for this branch.
- **Copy, then regenerate, on non-in-place attached materialization without a replacement.** `copy_from(include_metadata=True)` copies the deferred source's metadata files, then `init_meta`/`set_meta` regenerates them because `has_metadata_files` is true for every BAM. The copy is wasted only when a deferred source actually has file metadata set. That is rare: deferred uploads never run set_meta, and model store exports strip metadata files by default. Avoiding it means copying only the non-file metadata, which is too intrusive for release_25.1. This is speculative and not measured on real data.
- **The per-file flush splitting the HDA UPDATE in two.** It is required for correctness under `store_by="id"`. The reasoning is the same as in round 1 (`earlier_drafts/1/performance_challenges_debrief.md`).
- **No new query-count test.** No fix was made. `test_copy_from_inserts_each_metadata_file_row_once` already pins the insert-once behaviour of `FileParameter.make_copy`, the code both paths share.

## Measurements (data)

The harness is `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/d6f2485d-f4c6-4ed8-8c54-dd4ae3578d00/scratchpad/perf2/test_perf_inplace.py`. It uses SQLite and the disk object store, with the `_deferred_bam_with_replacement` fixture: one deferred BAM, plus an OK replacement BAM with a `bam_index`. Each run does one `ensure_materialized` and then a commit.

| path | SQL | object store calls |
|---|---|---|
| in-place, share rows (the base line, swapped in temporarily) | SELECT 12, UPDATE dataset 2, UPDATE hda 1, INSERT hda_history 1 | create 1, exists 1 |
| in-place, branch (copy) | SELECT 14, UPDATE dataset 2, UPDATE hda 2, INSERT hda_history 2, INSERT metadata_file 1 | create 2, exists 4, get_filename 2, update_from_file 1 |
| not in-place, branch (copy) | SELECT 15, INSERT metadata_file 1, UPDATE hda 1, ... | create 2, exists 4, get_filename 2, update_from_file 1 |

Each file copied on the in-place path adds:
- SQL: +2 SELECT, +1 INSERT, +1 HDA UPDATE and +1 history row. The last two come from the mid-materialization flush.
- Object store: +4 calls, the same per-file profile as the job cache path in round 1.
- No `UPDATE metadata_file`.

## Why it stays

- **Where it runs.** The caller is `WorkflowRequestMonitor.__attempt_materialize` → `HDAManager.materialize(in_place=True)`. It runs in the scheduler thread, not in an API request, and it already commits once per input. The added flush stays inside that per-input transaction, and nothing loops or fans out beyond one copy per file metadata value.
- **How many copies.** The copy happens only when a replacement dataset is found. K is the number of file metadata values: 0 for most datatypes and 1 (`bam_index`) for BAM. A workflow over N deferred BAMs that all have replacements pays N × (1 INSERT + about 4 object store calls). On a remote store that is about 5 more HEAD/PUT calls per file, plus a GET when the source is not cached, as measured in round 1.
- **Detached materialization.** It still shares `_metadata` (no rows, no I/O), so its cost is unchanged from base.
- **Process patterns checked.** The branch adds no unbounded queries, list-endpoint fields, joins, CTEs or async handlers. Flush hygiene was reviewed above.

## Validation

- `test/unit/data/test_dataset_materialization.py` and `test/unit/data/test_model_copy.py`: 29 passed.
- The worktree is unchanged; the temporary base-line edit to `deferred.py` was restored, and `git status` is clean.

## Details

The base line was measured by temporarily swapping the in-place line back to `materialized_dataset_instance._metadata = replacement_dataset._metadata`, running the harness and restoring the file.
