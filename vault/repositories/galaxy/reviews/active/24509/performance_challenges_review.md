# Performance challenges review — PR #24509

- Profile: gx_performance_challenger
- Model: Opus 5.5 (`claude-opus-5-5`), medium effort
- Reviewed commit: `7aa5ec64156429e19c6160f1a37645554106e23c`
- Debrief with measurements: [performance_challenges_debrief.md](performance_challenges_debrief.md)

Verdict: no performance blockers. The new `delete_library_datasets` action is one set-based statement on indexed join columns, consistent with its sibling actions. Measured on a synthetic 2M library_dataset / 4M LDDA PostgreSQL 16 database: backlog first run 11.5 s (193k LDs, 387k LDDAs), steady state ~1 s, `--force-retry` 4.4 s. Synthetic LDDA rows are narrow (~10 bytes); real LDDA rows are wide and carry more indexes, so these timings are lower bounds.

### P3 1: under `--force-retry` the reported/logged library datasets are not the ones the event changed

The final `SELECT` returns every `target_lds` row via `LEFT OUTER JOIN`, whether or not either update CTE touched it. Under `--force-retry`, `target_lds` is every deleted LD past the cutoff, including all purged on earlier runs, but `purged_lds` keeps `AND NOT ld.purged` and the LDDA update keeps `deleted IS NOT TRUE`, so already-reconciled LDs are reported without being changed. `Action._log_results` logs `library_dataset_id: X` for each primary unconditionally. Sibling actions also log large sets under `--force-retry`, but they re-update what they report; here the reported set diverges from the changed set. In the synthetic first force-retry run about 32k of 97,451 reported LDs were untouched; a repeat force-retry would report all ~97k as no-ops. Minor: force-retry is a rare manual run.

<details><summary>Evidence</summary>

`EXPLAIN ANALYZE` of the action SQL with `force_retry_sql = ""` on the synthetic DB: top `Merge Left Join` rows=130262 (97,451 target LDs), `deleted_ldda_ids` rows=97,855 (LDs with live versions), `purged_lds` rows=162; single-version LDs (~1/3 of fixture) had nothing to reconcile. `pgcleanup.py` `_log_results` (around line 228) logs the primary before iterating causals.

</details>

Filter the final select to changed rows; the default run is unaffected since every target is purged there.

```sql
        FROM target_lds t
             LEFT OUTER JOIN deleted_ldda_ids ON t.id = deleted_ldda_ids.library_dataset_id
             LEFT OUTER JOIN purged_lds ON t.id = purged_lds.id
       WHERE deleted_ldda_ids.id IS NOT NULL OR purged_lds.id IS NOT NULL
    ORDER BY t.id
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort.

</details>

## Not filed (informational)

- Steady-state planner misestimate: `deleted AND NOT purged` on `library_dataset` estimated 222k vs 162 actual (correlated columns), so each nightly run seq-scans all LDDA and LD (~1 s per 4M LDDAs; linear). `CREATE STATISTICS (mcv) ON deleted, purged` dropped it to 0.23 s with index nested loops. Needs a migration and the same predicate shape already exists for `history` actions, so not a finding against this PR.
- Unbounded single transaction for the first backlog run: consistent with sibling actions; admins can stage with `--older-than`.
