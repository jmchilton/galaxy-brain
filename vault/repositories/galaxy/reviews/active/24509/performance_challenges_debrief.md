# Performance challenge debrief — PR #24509

Reviewed commit `7aa5ec64156429e19c6160f1a37645554106e23c` (`DeleteLibraryDatasets` in `scripts/cleanup_datasets/pgcleanup.py`). Profile gx_performance_challenger, Opus 5.5 (`claude-opus-5-5`), medium effort.

## Scope

One new opt-in cron action: a single data-modifying CTE that selects deleted `library_dataset` rows past the cutoff, marks all their LDDAs deleted, marks the LDs purged, and writes two audit tables. No API, no request path, no client polling. `DeleteDatasets`/`PurgeDatasets` are unchanged.

Pattern checklist: unbounded query — yes, but same as every sibling action (only `PurgeDeletedHDAs`-style actions use `:batch_size`); acceptable for an admin cron job. No per-row Python round trips; one statement. CTE `target_lds` is referenced three times so PG materializes it once. Join columns are indexed (`library_dataset_dataset_association.library_dataset_id`, `library_dataset.deleted`, `.purged`, PK). No fan-out joins.

## Measurements (data-based)

Throwaway `postgres:16` container, synthetic minimal schema mirroring the model's indexes: 2,000,000 `library_dataset` rows (85% live, 10% deleted-not-purged backlog, 5% deleted+purged), 4,000,001 LDDAs (1–3 versions each). Action SQL copied verbatim with `:days = 30`, `:event_id = 1`, run under `EXPLAIN ANALYZE` inside `BEGIN … ROLLBACK`. Scripts in the reviewer's scratchpad (not committed). Synthetic LDDA rows are narrow (~10 bytes) with 3 indexes; real LDDA rows are wide and, because `deleted` is indexed, updates are non-HOT and touch every index — treat all timings as lower bounds.

| scenario | targets (LD / LDDA) | plan | time |
|---|---|---|---|
| backlog first run (#19766 case) | 193,586 / 386,955 | hash join + seq scan LDDA; time dominated by LDDA row writes + index maintenance | 11.5 s |
| steady state (new deletions only) | 162 / 318 | **hash join + seq scan of all 3.5M LDDA and 1.7M LD** | 1.1 s (after VACUUM ANALYZE), 2.0 s before |
| steady state + `CREATE STATISTICS (mcv) ON deleted, purged` | 162 / 318 | nested loop on `ix_ldda_ldid` and LD pkey | 0.23 s |
| `--force-retry` | 97,451 target LDs, 97,855 LDDAs reconciled, 162 LDs purged | hash join | 4.4 s; returns 97,451 result rows |

Findings from the data:

1. **Steady-state misestimate.** `WHERE deleted AND NOT purged` is estimated at 222,426 rows vs 162 actual, because `deleted` and `purged` are strongly correlated (nearly every deleted LD ends up purged once this action runs) and PG assumes independence. The planner therefore full-scans LDDA and LD every nightly run. Cost is linear in table size (~1 s per 4M LDDAs here). This is the same predicate shape as existing actions on `history` (`deleted AND NOT purged`), so it is a pre-existing pgcleanup trait, not something this PR introduced uniquely. Extended statistics (or a partial index `ON library_dataset (id) WHERE deleted AND NOT purged`) fixes it, but both need a migration — out of scope for this PR; not worth blocking on for a cron job.
2. **Backlog first run** is one transaction holding row locks on every affected LDDA/LD for its duration (~11 s at ~390k LDDAs here). Acceptable and consistent with siblings; a site with a much larger backlog can bound it with `--older-than`.
3. **`--force-retry` output noise.** The final `SELECT … FROM target_lds LEFT JOIN …` returns every target LD even when neither CTE changed it. Under `--force-retry` that is every historically purged deleted LD past the cutoff (97,451 here); ~65k had live versions reconciled, ~32k (single-version fixture rows) were untouched, and a repeat force-retry would report all ~97k as no-ops. `Action._log_results` logs `library_dataset_id: X` for each primary unconditionally, so the logged id set no longer equals "what this event did" — unlike sibling actions, whose force-retry mode re-updates the rows it reports (their logs are large too, so volume alone is not new).

## Recommendations

- P3: filter the final SELECT to rows that changed:
  ```sql
       WHERE deleted_ldda_ids.id IS NOT NULL OR purged_lds.id IS NOT NULL
  ```
  (No effect on the default run, where every target is purged.)
- Not filed as a finding (needs a migration, pre-existing pattern): consider `CREATE STATISTICS ... (mcv) ON deleted, purged` on `library_dataset` (and `history`) or partial indexes, if pgcleanup steady-state runs ever show up as slow on large instances.

## Measurement plan for a production-size DB

Run against a usegalaxy-scale replica, inside a transaction that is rolled back:

```sql
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) <action SQL with :days=<site value>, :event_id=0>;
ROLLBACK;
```

Check (a) the `target_lds` row estimate vs actual, (b) whether LDDA is seq-scanned for a small target set, (c) total time and `Rows` for a `--force-retry` run. Also `SELECT count(*) FROM library_dataset WHERE deleted AND NOT purged` to size the first backlog run before scheduling it.
