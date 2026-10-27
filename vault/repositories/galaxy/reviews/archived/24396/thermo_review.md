# Thermo review — galaxyproject/galaxy#24396

Profile: thermo_review · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `770965bef62` (diff vs merge-base with `origin/release_26.1`)

## Verdict

Sound fix direction for a release branch; core change (one ordered `config_sources` list rebuilt through a staging manager) is the right shape. Main maintainability cost: `ToolDataTableManager` now has two parallel load/reload/register modes keyed on `config_sources is not None`. That's too big to unify in a release backport, so it's collapsed into one P2 with a follow-up plan in [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md). Rest are small cleanups. No bugs hunted.

## Findings

### P2 1: Dual-mode `ToolDataTableManager` (legacy `config_filename` vs new `config_sources`)

`__init__`, `reload_tables`, and `add_new_entries_from_config_file` each branch on `self.config_sources is not None`, keeping the old per-file load/merge/reload path alive next to the new ordered-sources path. The two have different semantics (source order, duplicate handling, staging, `on_registration`), so tool_util consumers (planemo, tool shed, tests using `config_filename=`) get different behavior from Galaxy's app. Better end state: `config_filename` is normalized into `List[ToolDataTableConfig]` in `__init__`, and only the sources path remains. Too large for a 26.1 fix; see the follow-up plan.

### P3 1: Table-type compatibility assert duplicated

The `type(existing) is type(x) or (both TabularToolDataTable)` assert appears verbatim in `_register_from_config_file` and `_reload_from_config_sources` (`lib/galaxy/tool_util/data/__init__.py`). Extract a `_assert_compatible_table(name, existing, candidate)` helper (could sit beside `assert_data_table_consistency`).

### P3 2: Managed-source list construction belongs with `ToolDataTableConfig`, not the app

`MinimalGalaxyApplication._configure_tool_data_tables` (`lib/galaxy/app/__init__.py`) builds sources with realpath identity dedupe and two near-identical `ToolDataTableConfig(...)` constructions for the managed file (in-loop and appended). Hoist to a small tested function (e.g. `build_tool_data_table_sources(paths, managed, from_shed_config, managed_optional)`) in `galaxy.tool_util.data`; computing `optional` once removes the repeated `not self.config.is_set(...)`, and app code shrinks to one call. Test it directly in place of app-level setup.

### P3 3: In-place `__class__`/`__dict__` swap to publish rebuilt tables

`_reload_from_config_sources` does `existing.__class__ = type(rebuilt); existing.__dict__ = rebuilt.__dict__` to keep references valid across a Refgenie↔tabular switch. It works, but it's an implicit contract any future `__slots__`/cached attribute breaks. At minimum, name it as a method (`existing._replace_with(rebuilt)`) so the trick lives in one documented place; longer term, callers should resolve tables by name instead of holding table references (part of the follow-up).

### P3 4: Watcher callback lambda duplicates the reload dispatch

`update_watch_data_table_paths` (`lib/galaxy/config_watchers/__init__.py`) inlines a lambda calling `send_control_task("reload_tool_data_tables", kwargs={"path": path})`, and `_tool_data_tables_registered` in the app sends the same task by `table_name`. A small `ConfigWatchers`/queue-worker helper (`reload_tool_data_tables_for(path=..., table_name=...)`) would give one dispatch point. The `tool_data_paths` loop that derives directories from `table.filenames` while skipping `transient` is reasonable; the `transient` flag in `FileNameInfoT` is a fine reusable addition.

## Notes (non-findings)

- Removing value-based dedupe in `merge_tool_data_table` simplifies code and moves policy to `add_entries`; good.
- Moving the `StructuredApp` import to module top in `queue_worker` follows import guidance.
- `test_ordered_data_tables.py` (433 lines) is large but focused; I didn't audit it for trivial cases at this effort.
