# Implementation debrief

STATUS: READY. Scope: keep (round 2 [scope evaluation](scope_evaluation.md)), after one modest re-scope.

## Final implementation (`release_26.1`, tip `27060b3478e`, +126/-21)

1. `8fbd5381555` Declare `columns` on `ToolDataTable` (refactor): drops `getattr` fallback in `assert_data_table_consistency` and the dead `columns is not None` guard in `install_tool_data_tables`.
2. `1c2d354892f` `_show_tool_data` / `_testbeta_fields` helpers in `test_tool_data_delete.py` (test refactor).
3. `cd895276abe` Startup skips conflicting shed tables: `load_from_config_file` checks each table via `assert_data_table_consistency` (strict default raises `DataTableColumnMismatch`); `skip_column_mismatches=True` logs + skips, passed only by `_configure_tool_data_tables` for the shed config. Un-bricks servers already in the bad state. Integration test `TestConflictingShedToolDataTableIntegration` (red: server won't boot).
4. `b2ea2184472` `handle_missing_data_table_entry` no longer calls `reset_tool_data_tables()` on the live Galaxy registry (root of the install-check bypass). Unit test against a real `ToolDataTableManager`.
5. `27060b3478e` `merge_tool_data_table` raises `DataTableColumnMismatch` instead of a bare `assert`.

## Choices

- Base `release_26.1` (John); the install guard exists from 26.1. 26.0 backport would be a port, separate branch.
- Strictness kept for admin `tool_data_table_config_path` and install-time loads; only the Galaxy-written shed config is tolerant at boot.
- Declined moving `reset_tool_data_tables` to the Tool Shed on a release branch (public method; comment added instead).
- tools-iuc `indexed_maf_files` collision out of scope — even fixed, this DM still can't install alongside core (install refuses with `DataTableColumnMismatch`).

## Validation

Unit 43 passed (`test/unit/tool_util/data`, `test_data_table_manager.py`, `test_install_manager.py`); integration `test_tool_data_delete.py` 2 passed; mypy clean on changed files; repro script against 26.1 vs branch confirms boot survives a conflicting shed table. Reviews: [normal](subagents/normal_review.md), [re-scope](subagents/rescope_review.md), [test challenges](test_challenges_debrief.md), [codex](codex_review.md), [thermo](thermo_nuclear_review.md), [baseline](baseline_refactor.md) — no blockers. Round 1: [earlier_drafts/1/](earlier_drafts/1/).

## Follow-ups (dev)

- Move `reset_tool_data_tables` Tool Shed-side.
- Atomic strict `load_from_config_file` and `reload_from_files`.
- Surface skipped shed tables to admins (UI/API).
- File a tools-iuc issue for the `indexed_maf_files` rename (John's call).
