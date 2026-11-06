# Performance challenge debrief: #24745

Profile: gx_performance_challenger. Model: Opus 5.5. Effort: medium. Reviewed commit: `5fad7684e37`. Final findings: [performance_challenges_review.md](performance_challenges_review.md).

Nothing in the PR was edited. The worktree stayed clean.

## What was measured

Scripts, kept beside this file:

- `perf_full_delete_harness.py` (SQLite in memory, stub object store): SQL statements per scenario. `baseline` is the PR code with `_delete_metadata_files` stubbed to a no-op, not a merge-base checkout. `subquery` and `early` are candidate fixes for P3 1. `subquery` is unsafe, see below.
- `perf_delete_library_datasets.py` (PostgreSQL 16.2 from `pgserver`, on a laptop): runs `DeleteLibraryDatasets._action_sql` from the merge-base and from the PR, against synthetic data, 200,000 library datasets with 1 version and 1 metadata file each, plus 1 library dataset with 20 versions and 60 metadata files. It truncates tables, so it refuses anything but a local-socket database.
- `perf_swap_check.py`: reassigns an HDA's dataset, as `copy_from` does, then calls `full_delete()` on the old dataset, to see whether the live output's metadata files survive. It imports the harness, so run it from this directory.

Times are single runs and only indicative. Statement counts are exact for these scenarios. Object store latency was not measured.

### `Dataset.full_delete`

| scenario | variant | statements | metadata SELECTs | store deletes | time |
| --- | --- | --- | --- | --- | --- |
| `purge_datasets` loop, 500 datasets, 1 copy each | baseline | 2001 | 0 | 500 | 477 ms |
| | PR | 2502 | 500 | 1000 | 654 ms |
| | subquery | 2502 | 500 | 1000 | 619 ms |
| direct `full_delete`, 5000 copies | baseline | 2 | 0 | 1 | 0.8 ms |
| | PR | 6 | 1 | 5001 | 100 ms |
| | subquery | 4 | 1 | 5001 | 79 ms |
| `user_can_purge` then delete, 5000 copies | baseline | 5 | 0 | 1 | 101 ms |
| | PR | 7 | 1 | 5001 | 137 ms |
| | subquery | 7 | 1 | 5001 | 184 ms |
| `copy_from`, 1 output, no metadata file | baseline | 2 | 0 | 1 | 9.5 ms |
| | PR | 5 | 1 | 1 | 4.4 ms |
| | subquery | 3 | 1 | 1 | 3.5 ms |
| | early return | 4 | 0 | 1 | 2.2 ms |

The times in the last two groups are too noisy to rank variants. Use the statement counts.

### Pending dataset swap

| variant | session autoflush | live output's metadata file purged | old copy's metadata file purged |
| --- | --- | --- | --- |
| PR | True | no | yes |
| PR | False | no | yes |
| subquery | True | no | yes |
| subquery | False | **yes** | yes |

Galaxy sessions use `autoflush=False`, so the subquery variant would delete a live output's metadata files.

### `delete_library_datasets` SQL

| run | rows returned | rows for 20-version dataset | time |
| --- | --- | --- | --- |
| base, first run | 200,020 | 20 | 10.2 s |
| PR, first run | 201,200 | 1,200 | 33.6 s |
| base, `--force-retry` no-op | 0 | 0 | 148 ms |
| PR, `--force-retry` no-op | 0 | 0 | 140 ms |

The first-run comparison favors base: it ran first, and its rollback left dead tuples for the PR run. Each first run also rolled back rather than committed.

## Measurement plan for a production-size check

Not run. Worth doing only if the numbers above raise concern for a large instance.

1. Run `EXPLAIN (ANALYZE, BUFFERS)` by hand on the PR's rendered `delete_library_datasets` SQL inside a rolled-back transaction on a production copy. Don't use `perf_delete_library_datasets.py` for this. Record statement time, locks held and the real versions-per-library-dataset distribution, which sets the size of P3 2.
2. Query the real copy distribution: `SELECT count(*) FROM metadata_file mf JOIN history_dataset_association hda ON mf.hda_id = hda.id GROUP BY hda.dataset_id ORDER BY 1 DESC LIMIT 20`. This bounds the sweep in P3 4.
3. Time a single `object_store.delete` for a missing and a present metadata file on the instance's remote store. Multiply by the counts from step 2 to size P3 3 and P3 4.
4. Count job-cache hits per day. Multiply by the extra statements per output to size P3 1.
