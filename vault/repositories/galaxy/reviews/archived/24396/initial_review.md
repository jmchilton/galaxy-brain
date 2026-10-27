# PR #24396 initial review (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `770965bef62` (diffed against merge-base with `origin/release_26.1`)
- Tests run: every touched unit test module (`test_ordered_data_tables.py`, `test_refgenie_data_table.py`, `test_data_manager_reload.py`, `test_tool_data.py` x2, `test_dynamic_options.py`, `test_install_manager.py`): 67 passed. Plus one ad-hoc probe (below).

## Verdict

Mergeable once P2 1 is handled, either by landing #24323 first or by pulling in its choice collapse. The core design is sound: build an ordered list of `ToolDataTableConfig` sources, rebuild only the affected tables from all sources, then publish in place. It fixes runtime registration appending managed rows at the end, and it does this without disturbing references that tools hold. Validate-before-write on registration, `realpath` in `to_xml_file`, and the watcher callback fix (later-added dirs used to get no callback) are real improvements. Test coverage is broad.

Context, not findings:
- This is about 900 lines on a release branch.
- It overlaps the still-open #24323, also by mvdbeek against `release_26.1`. It includes that PR's dedup reversal but not its choice-collapsing half.
- It leaves `ToolDataTableManager` with two parallel load/reload modes (P2 2).

## Findings

### P2 1: Overlapping sources now produce duplicate select choices

The PR drops the value-dedup in `TabularToolDataTable.merge_tool_data_table` that `release_26.1` has (commit `5f105497ad1`). Now every row that is not an exact duplicate is kept. `get_field` and `DynamicOptions.get_field_by_name_for_value` take the first match, so path resolution follows source order correctly. `DynamicOptions.get_options` (`lib/galaxy/tools/parameters/dynamic_options.py`, the `tool_data_table` branch) and `to_parameter_options` don't collapse duplicates by value, though. So the case this PR documents (local, managed and IDC files all providing `hg38`) now shows one `hg38` choice per source. On the base branch it showed one.

<details><summary>Evidence</summary>

Probe on the PR head: two sources (`local.xml`, `managed.xml`) each define `all_fasta` with `hg38\tHuman\t/<source>/hg38.fa`, and `<options from_data_table="all_fasta" />` reads them.

```
OPTIONS [ParameterOption(name='Human', value='hg38', ...), ParameterOption(name='Human', value='hg38', ...)]
PATH ['/local/hg38.fa']
ROWS [['hg38', 'Human', '/local/hg38.fa'], ['hg38', 'Human', '/managed/hg38.fa']]
```

The new `test_merged_data_table_filters_versions_before_resolving_value` only covers the case where a `static_value` filter narrows the rows to one. That's why it doesn't catch this.

</details>

Either make this PR depend on #24323 and say so (merge #24323 first), or carry #24323's first-wins choice collapse in `get_options` here. Add an unfiltered two-source assertion on `get_options` to `test_dynamic_options.py`.

### P2 2: Two parallel load/reload/register code paths in `ToolDataTableManager`

`__init__`, `reload_tables` and `add_new_entries_from_config_file` now each branch on `self.config_sources is None`.
- The new path, used only by the Galaxy app, rebuilds through a staging manager and `_reload_from_config_sources`.
- The legacy path, used by the tool shed app, `ValidationContext`, `galaxy_mock` and `galaxy-tool-util` consumers, still uses `config_filename` with `reload_from_files` / `_merged_load_info`.

With `config_sources` set, `_merged_load_info` is still filled on every table but never read. The two modes can also be combined: passing both `config_sources` and `config_filename` loads the latter out of band, and the next full `reload_tables()` silently deletes those tables. The legacy `persist=True` path catches all errors and returns them as `error_message`. The new one raises reload errors (see P3 1). This leaves the code with two layers instead of one reusable abstraction.

Suggested fix:
- Normalize `config_filename` into `[ToolDataTableConfig(f) for f in listify(config_filename)]` inside `__init__`, so every manager uses the source-ordered path.
- `reload_from_files` / `_merged_load_info` can then go, or become a thin per-table wrapper.
- If that's too much for a release branch, at least reject passing both `config_sources` and `config_filename`, and open a dev follow-up to unify.

### P3 1: Reload failure after persisting escapes the `(elems, error_message)` contract

`_register_from_config_file` writes the managed XML and then calls `self.reload_tables(names)` outside the `try`. That reload re-parses every configured source, not just the incoming one. An error there, for example an unrelated admin XML file edited into a broken state since startup, propagates to the caller. `InstallRepositoryManager` (`install_manager.py`, the `add_new_entries_from_config_file(..., persist=True)` call) doesn't catch it, so the install aborts after the repository row is committed and the XML is written. The legacy path reported such errors through `error_message`. `test_failed_reload_keeps_table_state_and_notifies_after_persist` locks in the raise.

Either catch the error, log it and return it as `error_message`, since the registration is already durable and peers are notified, or document that the caller must handle it.

### P3 2: Extra loc-file directories are watched recursively

`ConfigWatchers.tool_data_paths` now adds the parent directory of every non-transient loc file, and `start()` / `update_watch_data_table_paths` watch each one with `recursive=True`. Recursion makes sense for `tool_data_path` and `shed_tool_data_path`. For an arbitrary loc file parent it can put a recursive watch on a large reference tree (loc files kept at the root of a genomes mount, or a CVMFS path). That costs inotify watches and adds event noise. Nested dirs also get watched twice, and only the md5 path-hash dedup hides that.

This only applies with `watch_tool_data_dir` enabled. Watch the extra directories non-recursively, and skip those already covered by a recursively watched ancestor.

### P3 3: Duplicated watcher callback and type-compat assert

- The `reload_tool_data_tables` lambda passed to `watch_directory` (with `require_extensions=(".loc",)` and `recursive=True`) is now copied in both `ConfigWatchers.start()` and `update_watch_data_table_paths`. Extract a `_watch_tool_data_dir(path)` helper.
- The `assert type(existing) is type(x) or (both TabularToolDataTable)` check is copied in `_register_from_config_file` and `_reload_from_config_sources`. Extract a helper. Since `TabularToolDataTable` is the base of every registered type, the check is effectively always true. Consider dropping it rather than keeping two copies.

### P3 4: Per-table control tasks on registration

`_tool_data_tables_registered` sends one `reload_tool_data_tables` control task per table name. Each one makes every peer re-parse all configured source XML files and call `xml_to_string` on every table element. On large instances `shed_tool_data_table_conf.xml` is big. `reload_tables` already accepts a list (`listify`), so one task with `table_name=names` would do. `DataManager._reload` follows the same per-name pattern and could share the hook.

### P3 5: Imports inside a test function

`test_url_downloads_are_not_watched_but_missing_location_files_are` imports `pathlib.Path` and `galaxy.config_watchers.ConfigWatchers` inside the function body. Move them to the top of `test/unit/app/tools/test_ordered_data_tables.py`.

### P3 6: Naming: `ToolDataTableConfig` vs `config_sources`

The parameter is `config_sources` and the docstring calls the class "A read source", but the class is `ToolDataTableConfig`. That reads like the whole configuration. `ToolDataTableConfigSource` would match the parameter and the docs. It's cheap to rename now, before the name ships in `galaxy-tool-util`.

## Notes (not findings)

- `BaseShedToolDataTableManager.reset_tool_data_tables` still sets `data_tables = {}` on the live Galaxy app after `handle_missing_data_table_entry`. That code is pre-existing and this PR doesn't touch it. Under the new path a full `reload_tables()` actually recovers those tables, because it rebuilds from definitions.
- The tests rely heavily on `Mock(spec=UniverseApplication)` and private-method binding. One integration test would be worth adding later: run a data manager with the managed file listed first, then check `/api/tool_data/<table>`. The unit suite is acceptable for a release fix.
