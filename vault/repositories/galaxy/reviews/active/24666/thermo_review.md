# Thermo review — PR #24666

Profile: thermo_review (shared.md). Model: Claude Opus 5.5, effort low (agent-set). Reviewed commit: 7587ed8a9ff.

## Verdict

Approve-level structure for a release-branch bug fix. The new `PopulateLease` ABC + `populate_once` coordinator is a real reusable abstraction (backend-neutral interface, composite delegates to default store), and `cached_toolbox.py` consolidates two copy-pasted populate/reload blocks into `_populate_once`/`_reload_tool_index`/`_panel_ids_missing_from_index` — net de-accretion. No significant refactor warranted; no follow-up refactor issue written. Only minor findings.

## Findings

### P3 1: Backend-neutral coordinator depends on SQLAlchemy exceptions

`coordination.py` takes an abstract `PopulateLease` but catches `sqlalchemy.exc.SQLAlchemyError`/`OperationalError` to decide fallback vs. retry. The error contract of the interface is thus implicitly "raises SQLAlchemy errors", leaking the only implementation into the abstraction (and into `_FlakyLease` in tests). Cheap fix: document the raised types on `PopulateLease` (e.g. a `PopulateLeaseUnavailable`/transient error the SQLAlchemy lease translates to), or at minimum note in the `PopulateLease` docstring that implementations raise `SQLAlchemyError`. Fine to defer given release target.

### P3 2: Duplicated multi-process "ready/go" test harness

`test_coordination.py::test_one_of_many_processes_populates_while_the_others_wait` and `test_sqlite_store.py::test_processes_opening_a_new_store_concurrently_all_succeed` each inline the same ~25-line spawn/ready-files/go-signal/communicate/kill loop. Extract a shared helper (e.g. `run_processes_on_signal(script, args_per_process, workdir)`) in the `source_store` test package.

### P3 3: `_populate_once` reload bookkeeping is subtle

`CachedToolBox._populate_once` uses a `nonlocal reloaded` flag set inside a closure to decide whether to reload afterwards (`if populated or not reloaded`). Correct but hard to read; the reload-after-populate could instead be done in the populate callback passed to `populate_once` (wrap `_run_inline_populator` + `_reload_tool_index`), and the "not reloaded" case only arises on the `lease is None`/fallback paths, which could reload explicitly. Minor readability nit.

## Notes (not findings)

- `_SqlAlchemyPopulateLease` reaches into store privates (`_session`, `_write_lock`); acceptable as a same-module collaborator.
- `populate_lease()` returns a lease for writable non-SQLite server DBs too, where the lease table isn't auto-created; the coordinator falls back with a warning on every boot. Behavioural, flagged for the bug-checking reviewer rather than here.
