# Initial review — PR #24509 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `7aa5ec64156429e19c6160f1a37645554106e23c`
- Files: `scripts/cleanup_datasets/pgcleanup.py`, `test/integration/test_scripts_pgcleanup.py`

## Verdict

Solid, small, opt-in port. SQL follows the existing `Action` conventions (`{force_retry_sql}`, `{update_time_sql}`,
`:event_id` audit inserts, `causals`) and matches legacy `cleanup_datasets.py` `delete_datasets()` selection
(`deleted AND NOT purged AND update_time < cutoff`, current + expired LDDAs, then `ld.purged = true`). Audit
table/column names match `CleanupEventLibraryDatasetAssociation` / `CleanupEventLibraryDatasetDatasetAssociationAssociation`.
No bugs found. Main gap: the PR's central design choice (not stamping `ldda.update_time`) isn't pinned by tests.

## Findings

### P2 1: Tests don't pin the "ldda.update_time is not stamped" invariant

The comment in `DeleteLibraryDatasets` and the PR body say leaving `ldda.update_time` alone is what lets
`delete_library_datasets delete_datasets` chain in one run. The chained test uses `--older-than 0` only. Each
action commits separately (`Cleanup._update` -> `_flush` -> `conn.commit()`) and Postgres `NOW()` is
transaction-start time, so `NOW()` advances between actions
and `DeleteDatasets`' veto `ldda.update_time >= NOW() - 0 days` is false even if the ldda had been stamped by the
previous action. The test would therefore stay green if someone later adds `{update_time_sql}` to the ldda
UPDATE (a natural "consistency fix"), and the chain would silently stop working for any real `-o N > 0`.

Suggested fix: in `test_delete_library_datasets`, record `ldda.update_time` (via `_db_get`) before the
`--older-than 0 delete_library_datasets` run and assert it's unchanged after, alongside `version_deleted`.
Cheap, and it pins the actual invariant rather than a side effect.

### P3 1: "All versions" and audit rows untested

The action's selling points are (a) marking expired LDDA versions too (join on `ldda.library_dataset_id`), and
(b) writing the two previously-unused audit tables. The tests only check the current `ldda_id` and never look
at `cleanup_event_ldda_association` / `cleanup_event_library_dataset_association`. If a populator path to create
a second version is awkward, at least assert the audit rows for the current ldda/ld exist after the run (one
`select` through `self._app.model.session`).

### P3 2: `--force-retry` leaves `library_dataset.purged IS NULL` rows unpurged

`library_dataset.purged` is nullable (`Mapped[bool | None]`). Default runs exclude NULL rows via
`deleted AND NOT purged` (consistent with legacy and other actions, fine). With `--force-retry` those rows are
selected and their LDDAs marked deleted, but `purged_lds` filters `AND NOT ld.purged`, which is NULL, so the LD
is never marked purged — contradicting the PR table ("`purged = true`"). The LDDA side already uses
`IS NOT TRUE`; mirror it:

```diff
-                          AND NOT ld.purged
+                          AND ld.purged IS NOT TRUE
```

Niche (requires legacy NULL rows), hence P3.

### P3 3: Comment/docstring carry PR rationale

The docstring's third bullet (port history, "which pgcleanup.py did not port") and the 4-line `ldda.update_time`
comment justify design choices rather than describe behaviour. Suggest trimming the docstring to the two
behaviour bullets and the comment to one line, e.g.
`# don't stamp ldda.update_time: DeleteDatasets vetoes on it, which would block chaining`.
History/rationale belongs in the commit message/PR body (already there).

### P3 4: PR body's `--dry-run` "inspect first" recipe under-reports

`--dry-run` rolls back after each action (`Cleanup._flush`), so in
`--dry-run -o 0 delete_library_datasets delete_datasets purge_datasets` the later actions never see the LDDA
changes, and `delete_datasets` / `purge_datasets` will report none of the library-only datasets. Pre-existing
dry-run semantics, but the PR advertises this exact command for the #19766 backlog. Suggest noting in the PR
body (or the action docstring) that a dry run only shows the `delete_library_datasets` step. Relatedly, the
"whole sequence in a single invocation" claim holds only at `-o 0` (or `-U`): at `-o N > 0`, `delete_datasets`
stamps `dataset.update_time`, so `purge_datasets` in the same run waits N more days (existing behaviour).

## Notes (not findings)

- `requires_objectstore` stays `True` (default) though the action is DB-only; same as `DeleteDatasets` and other
  DB-only actions, so consistent.
- Undelete-after-purge hole and folder/library purge are explicitly called out as follow-ups in the PR body;
  not re-litigated here.
- Tests reach into the ORM (`_db_get` with `rollback()`) rather than the API; justified since LDDA `deleted`
  isn't exposed by the library API, and the force-retry test needs to fabricate a legacy row shape.
- No admin docs list pgcleanup actions, so nothing to update there.
