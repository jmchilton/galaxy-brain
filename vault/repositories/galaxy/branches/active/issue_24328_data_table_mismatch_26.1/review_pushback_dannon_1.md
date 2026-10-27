# dannon review 1 (#24349, approved at `7811fe4b0ca`)

No pushback; no contention. All three points addressed at `950b374198a`.

1. **Rebase onto source-ordering work** — done. Dropped `Extract build_tool_data_tables` commit instead of wrapping the new constructor: `_configure_tool_data_tables` now wraps `ToolDataTableManager(config_sources=..., on_registration=...)` in the `DataTableColumnMismatch` → `ConfigurationError` guard. `tool_util/data` kept the new `table_names` arg.
2. **Test through app path** — `test_tool_data_table_startup.py` calls `MinimalGalaxyApplication._configure_tool_data_tables` on a stub app, so resolving to base would fail it (raises bare `DataTableColumnMismatch`).
3. **Shed-first ordering names core file** — confirmed red, fixed in new commit: `DataTableColumnMismatch.existing_config_filenames` (from new `ToolDataTable.config_filenames()`); `data_table_conflict_message` points at the shed config when it holds the other definition. Test parametrized `shed_first`. Wording changed "remove this <table>" → "remove the <table>". Known gap: shed-first message lacks repository owner/revision (that info is on the existing table's XML, not parsed) — not worth more scope.

Not done: no follow-up issue needed.

## Suggested reply (top-level PR comment)

```
Thanks — rebased onto the source-ordering work.

- Dropped the `build_tool_data_tables` extraction; the guard now wraps the `config_sources`/`on_registration` constructor inside `_configure_tool_data_tables`, and the startup test calls that method directly so resolving to base would fail it.
- Good catch on ordering: with the shed config listed first the error named the core file. It now names the shed config whichever side loads first (new commit, test parametrized over both orders).

***Posted by model claude-opus-5-5 at effort low on jmchilton's behalf***
```
