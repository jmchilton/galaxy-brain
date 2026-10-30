---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools
  - galaxy/admin
  - galaxy/lib
component: Tool Data Tables
galaxy_areas:
  - tools
  - admin
  - lib
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 2
ai_generated: true
summary: "How ToolDataTableManager orders config sources, resolves .loc files, merges same-named tables and propagates reloads across Galaxy processes"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/24396"
  - "https://github.com/galaxyproject/galaxy/pull/24323"
related_prs:
  - 24396
  - 24323
related_notes:
  - "[[Component - Dynamic Tool Manager and Toolbox Lifecycle]]"
  - "[[Component - Tool Shed Data Model]]"
  - "[[Component - Pulsar Input Staging]]"
  - "[[Component - Tool Testing Infrastructure]]"
  - "[[Component - Tool Linters]]"
---

# Tool Data Tables

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA. [PR #24396](https://github.com/galaxyproject/galaxy/pull/24396) ("Honor administrator-configured data table source order", merged to `release_26.1` on 2026-10-26 as `5a5850702d0`) and [PR #24323](https://github.com/galaxyproject/galaxy/pull/24323) ("Collapse duplicate data table choices in dropdowns", merged as `eb1950c4740`) have both been merged forward to `dev`, so this note describes the ordered-source design they produced.

**In scope:** the table classes, `.loc` resolution, merging of same-named definitions, the duplicate-row policy, first-match lookups, configured source order, registration by Tool Shed installs and data managers, cross-process reloads, and `_loaded_content_version`. **Out of scope:** a per-tool list of tables, and the data manager bundle format beyond where it adds rows to a table.

## Map

| Piece | Where |
|---|---|
| `ToolDataTable`, `TabularToolDataTable`, `ToolDataTableManager`, source ordering, bundle processing | `lib/galaxy/tool_util/data/__init__.py` |
| `RefgenieToolDataTable` and Galaxy's manager subclass that registers it | `lib/galaxy/tools/data/__init__.py` |
| App wiring and the `on_registration` callback | `lib/galaxy/app/__init__.py:575-603` |
| Peer reload handler `reload_tool_data_tables` | `lib/galaxy/queue_worker/__init__.py:363-371` |
| `.loc` directory watcher | `lib/galaxy/config_watchers/__init__.py:107-159` |
| Tool Shed install registration | `lib/galaxy/tool_shed/tools/data_table_manager.py`, `lib/galaxy/tool_shed/galaxy_install/install_manager.py:176-183` |
| Data manager registration | `lib/galaxy/tools/data_manager/manager.py:229-279` |
| `/api/tool_data` service | `lib/galaxy/managers/tool_data.py`, `lib/galaxy/webapps/galaxy/api/tool_data.py` |
| Admin docs | `doc/source/admin/data_tables.md` |

## Table types

A table is a named list of rows (`data: list[list[str]]`) plus a column map (`columns: dict[str, int]`) that must include `value`.

- **`ToolDataTable`** (`tool_util/data/__init__.py:204-360`) is the abstract base. Its constructor records `_load_info`, the arguments needed to rebuild the table, and an empty `_merged_load_info`. It sets `_loaded_content_version = 1` (`:246`). It also reads `allow_duplicate_entries` (default `True`) and `empty_field_value`.
- **`TabularToolDataTable`** (`:363-987`) parses `<columns>` (comma list) or `<column name index>` elements (`parse_column_spec_element`, `:591-620`) and reads each `<file>` as separated lines, skipping `comment_char` lines and lines with too few fields (`parse_file_fields`, `:645-671`). `${__HERE__}` expands to the loc file's directory in rows and to the XML file's directory in `<file path>` (`_expand_here_template`, `:1049-1052`).
- **`RefgenieToolDataTable`** (`tools/data/__init__.py:43-178`) subclasses the tabular table. Its `<file>` is a refgenie YAML config. Each `<field>` (optionally a template over `__REFGENIE_UUID__`, `__REFGENIE_ASSET__` and similar keys) produces one column per genome/asset/tag (`:117-169`). `type="refgenie"` is only available through Galaxy's `ToolDataTableManager` subclass (`:182-187`). The `galaxy-tool-util` manager knows only `tabular` (`tool_util/data/__init__.py:1056`).

Because every registered type subclasses `TabularToolDataTable`, same-named tabular and Refgenie definitions can merge (they need equal `columns`, `:537-539`), and writes go only to tabular index files (`_tabular_filenames`, `:726-738`).

## `.loc` resolution

`TabularToolDataTable.configure_and_load` (`:405-534`) resolves each `<file>`:

1. `path=`, else `url=` (downloaded with `requests.get` into a `NamedTemporaryFile`, read, then deleted; the `filenames` entry is marked `transient`), else `from_config=` (a key looked up in the Galaxy config).
2. With `from_shed_config` and a `tool_data_path`, only the basename is kept and joined to `tool_data_path` (`:477-483`). This is the Tool Shed-side case. The Galaxy app does not pass a `tool_data_path` when registering.
3. If the path exists, it is used.
4. Otherwise, for a relative path, `tool_data_path/<basename>` is tried. If that is missing and the source isn't `from_shed_config`, `tool_data_path/<basename>.sample` is used (`:486-501`). Absolute paths get no fallback.
5. A file that still isn't found sets `missing_index_file`, logs a warning, and is still recorded in `filenames` with `found=False`.

`ToolDataPathFiles` (`:108-171`) speeds up step 3–4. Inside a `cached()` block it walks `tool_data_path` once and keeps the set of `.loc` / `.loc.sample` files. `exists()` checks that set and then falls back to `os.path.exists`. The listing is dropped when the outermost `cached()` exits, so it cannot go stale between load passes. The filesystem is injectable for tests (`ToolDataFilesystem`, `:88-105`).

The `filenames` dict (`FileNameInfoT`, `:177-185`) records each file with its `config_element`, `from_shed_config`, optional `tool_shed_repository` info and `transient` flag. It drives three things: which file a persisted row is written to, `get_table_names_by_path` for watcher reloads, and the watcher's directory list.

## Merging same-named definitions

When a later source defines a table name that is already loaded, `_load_from_elements` (`:1223-1258`) merges it into the first instance with `merge_tool_data_table(table, allow_duplicates=False)` (`:536-556`):

- The columns must match exactly, or the merge fails with an `AssertionError`.
- New `filenames` entries are added, and the incoming `_load_info` is appended to `_merged_load_info`.
- If the incoming definition sets `allow_duplicate_entries="False"`, the whole table switches to no-duplicates and `_deduplicate_data` (`:960-976`) removes repeated complete rows.
- All incoming rows go through `add_entries` → `_add_entry`. With `allow_duplicates=False`, `_add_entry` (`:804`) skips a row only if an **identical complete row** already exists.

The result is that rows keep source order, then XML `<file>` order, then line order. Rows that share a `value` but differ in another column (for example a snpEff `version`) are all kept. Before #24396, `release_26.1` commit `5f105497ad1` dropped any incoming row whose `value` was already present, which hid such rows from tool `<filter>`s. #24396 brought back complete-row deduplication.

Within one file, duplicates are kept unless the table sets `allow_duplicate_entries="False"`.

## First-match lookup

Precedence comes from row order, not from a uniqueness rule:

- `TabularToolDataTable.get_field(value)` (`:566-570`) returns the first row whose `value` column matches. The data-table field API (`ToolDataManager._data_table_field`, `managers/tool_data.py:113-117`) uses it with no tool filters.
- `get_entry` / `get_entries(..., limit=1)` (`:691-724`) return the first match on any column.
- `DynamicOptions.get_field_by_name_for_value` (`tools/parameters/dynamic_options.py:945-974`) looks up the submitted value **after** the tool's filters (`get_fields_by_value` runs `get_options`, which applies `<filter>`s, `:839-850`). If several rows still match, it uses the first and logs a warning. It doesn't join them.
- `SelectToolParameter.get_display_options` (`tools/parameters/basic.py:1400-1414`, from #24323) collapses table-backed choices that share a `value` to the first row, for `to_dict` and the workflow editor (`workflow/modules.py:1707`). Raw `get_options` keeps the duplicates for validation.

So the earliest source wins once filters have run. `doc/source/admin/data_tables.md` ("Duplicate values") documents this for admins, including the IDC/CVMFS case.

## Configured source order

Two settings define the sources (`config/schemas/config_schema.yml:808-832`):

- `tool_data_table_config_path` is a list (`listify_options`), resolved against `config_dir`. For the default value, the `.sample` file is used if the file doesn't exist (`add_sample_file_to_defaults` in `GalaxyAppConfiguration`, `config/__init__.py:759-770`).
- `shed_tool_data_table_config` is the managed file Galaxy writes on installs. It resolves against `managed_config_dir`.

`tool_data_table_config_sources()` (`tool_util/data/__init__.py:1088-1114`) turns these into a list of frozen `ToolDataTableConfigSource(filename, from_shed_config, optional)` (`:1079-1085`):

- Paths keep their configured order. Empty entries are skipped.
- The managed file is matched by `normcase(realpath())`, so symlinks and aliases count as the same file. It keeps its **first** listed position. Later repeats are dropped.
- If it isn't listed, it is appended last.
- `managed_optional` marks it optional. The app passes `not config.is_set("shed_tool_data_table_config")` (`app/__init__.py:576-581`). A missing default managed file is skipped (`ENOENT` only) and keeps its slot for when it is created later. A missing explicitly configured file, or any missing admin file, raises (`:1365-1370`).

`MinimalGalaxyApplication._configure_tool_data_tables` builds the Galaxy `ToolDataTableManager` with `config_sources=...`, `other_config_dict=self.config` (for `from_config=`) and `on_registration=self._tool_data_tables_registered` (`app/__init__.py:575-587`). The `tool_data_tables` property creates it lazily (`:598-603`). The source list is fixed at construction, so **changing the order requires a restart**.

### Two manager modes

`ToolDataTableManager.__init__` (`:1123-1152`) accepts either `config_sources` or the older `config_filename` (one path or a list). Passing both raises `ValueError` (`:1133-1134`).

| | `config_sources` (Galaxy app) | `config_filename` (legacy) |
|---|---|---|
| Users | `UniverseApplication` / `MinimalGalaxyApplication` | Tool Shed webapp (`tool_shed/webapp/app.py:86`, no files), `ValidationContext` (`tools/repositories.py:80`), `galaxy_mock`, `galaxy-tool-util` consumers such as planemo |
| Initial load | `reload_tables()` over all sources | `load_from_config_file` per file |
| `reload_tables` | staged rebuild from all sources (`_reload_from_config_sources`) | per-table `reload_from_files()` replaying `_load_info` + `_merged_load_info` (`:353-360`, `:1469-1483`) |
| `add_new_entries_from_config_file(persist=True)` | `_register_from_config_file` (validate, write, rebuild, notify) | merge into live tables, then append XML (`:1310-1324`) |

A follow-up to unify both modes on ordered sources was drafted during the #24396 review (`vault/repositories/galaxy/reviews/archived/24396/followup_refactor_issue.md`). It is not filed and not on `dev`.

## Rebuild from sources

`_reload_from_config_sources(table_names, path)` (`:1360-1415`) is the single rebuild path in `config_sources` mode. Startup, `reload_tables()`, registrations and data manager runs all use it.

1. Parse every source's `<table>` elements in order. Record `definitions[name] = [(source filename, serialized <table> XML), ...]`.
2. Choose the tables to rebuild:
   - explicit `table_names`, or
   - for a path-triggered reload (watcher): tables whose `filenames` contain the path, **plus** every table whose definitions differ from `_loaded_config_definitions`. New or edited `<table>` XML is picked up even when the changed `.loc` belongs to no loaded table yet (`:1376-1384`).
   - otherwise all loaded and defined tables.
3. Build those tables in a **staging manager** (`_new_staging_manager`, `:1326-1329`). It is a legacy-mode instance of the same class that shares the live `ToolDataPathFiles` cache. A parse or column error raises before anything live changes.
4. Publish each one:
   - Rebuilt and already present (or in `_removed_tables`): set the version to `existing._loaded_content_version + 1`, then `existing._replace_with(rebuilt)` (`:265-268`), which copies `__class__` and `__dict__` onto the existing object. Tools, dynamic options and validators that hold a reference see the new rows and version, even when a table switches between tabular and Refgenie.
   - No longer defined: empty its `data`, bump the version, remove it from `data_tables`, and keep it in `_removed_tables`. If the definition returns, the same object is reused (`8a86eb6054d`).
   - New: add it.
5. Update `_loaded_config_definitions`.

## Registration

### Tool Shed installs

`InstallRepositoryManager` (`install_manager.py:176-183`) runs only when the repository metadata has `sample_files`:

1. `ShedToolDataTableManager.install_tool_data_tables` (`data_table_manager.py:234-322`) copies `*.loc.sample` to `tool_data_path/shed/<name>.loc` (it doesn't overwrite an existing file). The repository's `tool_data_table_conf.xml(.sample)` goes to the per-revision dir under `shed_tool_data_path`. Each `<file path>` is rewritten to the shared `tool_data_path/shed/` file.
2. For each `<table>`, `assert_data_table_consistency` (`tool_util/data/__init__.py:1179-1188`) raises `DataTableColumnMismatch` if the name is registered with other columns. If the table is already registered, rows from the repository's `.loc.sample` are appended with an `# Added by owner/name@rev` comment (`_merge_loc_sample_entries`, `:173-204`, via `append_entries_with_attribution`, `tool_util/data/__init__.py:844-896`, which dedupes by `value`). If the shed config already has a `<table>` with the same name and file set, the element is not written again (`_shed_config_has_matching_entry`, `:206-232`).
3. `add_new_entries_from_config_file(conf, None, shed_tool_data_table_config, persist=True)` routes to `_register_from_config_file` (`:1331-1358`):
   - The incoming XML is loaded into a staging manager and its columns are checked against live tables. On failure it returns `([], message)` and changes nothing.
   - The elements are appended to the managed file with `to_xml_file` (`:1417-1460`). It writes to `realpath`, so a symlinked managed file updates its target, and it creates the file from an empty `<tables>` if missing.
   - `reload_tables(names)` rebuilds the affected tables from **all** sources, so the new rows sit at the managed file's configured position. A reload failure is logged and returned as `(elems, message)`.
   - `finally`: `on_registration(names)`.

The Tool Shed's own metadata generation calls the same method with `persist=False` on a legacy-mode `ValidationContext` manager (`tool_shed/metadata/metadata_generator.py:304`).

### Data managers

`DataManager.process_result` (`tools/data_manager/manager.py:229-246`) calls `ToolDataTableManager.process_bundle` → `_process_bundle` (`tool_util/data/__init__.py:1648-1757`):

- `add_entry(..., persist=True)` appends to the live table and to a loc file. The file is chosen by `_locate_filename` (`:898-907`): an explicit `tool_data_file_path` (must be one of the table's tabular files), else `get_filename_for_source(repo_info)`, which picks the file whose `tool_shed_repository` matches, falling back to the first file without repository info (`:741-773`).
- `remove` rows call `remove_entry`, which rewrites every tabular file without the row and then runs `reload_from_files()` on that table (`:909-918`).

Then `DataManager._reload` (`:266-279`) calls `reload_tables(table_names=...)` locally, so the appended row moves to its source-order position, and sends one `reload_tool_data_tables` control task per table with `noop_self=True`. The app's `on_registration` path instead sends one task with the full name list.

Bundle imports (`POST /api/tool_data`, Celery `import_data_bundle`) use the same `_process_bundle` with `bundle_mode=True` and then broadcast a full `reload_tool_data_tables` with no arguments (`celery/tasks.py:687`).

## Reaching other processes

Each Galaxy process (web workers, job handlers, Celery) keeps its own in-memory tables, so changes are spread by control tasks and file watchers:

- **`on_registration`** (`app/__init__.py:589-596`) refreshes the watcher's directory list and sends `reload_tool_data_tables` with `table_name=[...]` and `noop_self=True`.
- **`reload_tool_data_tables`** (`queue_worker/__init__.py:363-371`, mapped at `:586`) calls `app.tool_data_tables.reload_tables(table_names=table_name, path=path)` and then `watchers.update_watch_data_table_paths()`. `reload_data_managers` calls it with no arguments, which is a full reload (`:326-330`).
- **API**: `GET /api/tool_data/{table}/reload` and `DELETE /api/tool_data/{table}` (both `require_admin`) act locally and then broadcast the table name (`managers/tool_data.py:69-125`).
- **Watcher** (`ConfigWatchers`, enabled by `watch_tool_data_dir`): watches `tool_data_path` and `shed_tool_data_path` recursively, plus the directory of every non-transient file in any table's `filenames`. Directories under a root are skipped, and others are watched non-recursively (`config_watchers/__init__.py:111-159`). Only `.loc` changes fire. The callback sends `reload_tool_data_tables` with `path=` to **all** processes (no `noop_self`). The table XML config files are not watched. Edits to them are picked up by the next reload of any kind, because every reload re-parses all sources.

Since every process rebuilds from the same ordered sources, peers and restarts get the same row order. Under the old per-table `reload_from_files` replay, the order depended on when runtime merges happened.

## `_loaded_content_version` and caches

The version is a per-process counter on each table. It has no meaning outside the process (`:244-246`). It increases on `add_entry`, `remove_entry`, each loaded file, and every publish. A removed table keeps increasing it. Consumers store a version and compare it with `is_current_version`:

- `ValueInDataTableColumnValidator` (`tools/parameters/validation.py:356-372`) reloads its allowed values when the version changes.
- Display applications record a version for each table they read (`datatypes/display_applications/application.py:173-174, 364-369`) and reload when it changes.
- `visualization/genomes.py:212-256` tracks the `twobit` and `__dbkeys__` versions and rebuilds the genome list.

Because `_replace_with` keeps the object identity and the version always goes up, a reference held by a validator or tool stays usable and its caches are invalidated. A cache that compares only the version therefore needs no reference refresh. `DynamicOptions` stores no version. It reads `get_fields()` live on each `get_options` call (`dynamic_options.py:711-728, 839-842`).

## Tests

- `test/unit/tool_util/data/test_tool_data.py`: source ordering function, merge and dedup rules, `ToolDataPathFiles`.
- `test/unit/app/tools/test_ordered_data_tables.py`: registration order, optional managed slot, aliases, staged failure, reload discovery, removed-table reuse, watcher discovery, single peer task.
- `test/unit/app/tools/test_refgenie_data_table.py`, `test_data_manager_reload.py`, `test_dynamic_options.py`, `test_data_table_select_options.py`.
- `test/unit/tool_shed/test_install_manager.py`: install rebuild in configured order.
- `test/integration/test_tool_data_source_order.py`: managed file listed before an external file, registration through the running app, order checked via `/api/tool_data/{table}`. Also `test_data_manager*.py`, `test_tool_data_bundles.py`, `test_tool_data_delete.py`.
- `lib/galaxy_test/api/test_tool_data.py`: API behavior.

## Notes

- `_merged_load_info` is still filled in `config_sources` mode (the staging manager is legacy-mode), and it is what `remove_entry` → `reload_from_files()` replays. The replay uses the stored elements in source order. It doesn't re-read the XML.
- The managed source loads with `from_shed_config=False` in the app (`_configure_tool_data_tables(from_shed_config=False)`), while staged registrations parse with `from_shed_config=True`. The `.loc.sample` fallback therefore applies to managed entries on reload but not during registration staging. For shed installs it rarely matters, because the rewritten paths are absolute.
- Two issues found while researching this note are recorded in `vault/agents/gx_research/research_issues/`: `shed-install-loc-sample-rows-written-to-first-loc.md` and `data-tables-doc-stale-shed-loc-location.md`.
- The #24396 review record (`vault/repositories/galaxy/reviews/archived/24396/`) has the before/after walkthrough, the risk assessment and the review findings. Most of them landed on the PR before merge.
