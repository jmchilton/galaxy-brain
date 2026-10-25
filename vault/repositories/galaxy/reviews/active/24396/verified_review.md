### P2 1: Without #24323, overlapping sources show duplicate dropdown choices (implementation verified)

This PR carries #24323's complete-row merge and first-match `get_field`, but not its dropdown collapse (`SelectToolParameter.get_display_options`, used by `to_dict` and the workflow module). On `release_26.1` the value dedup in `merge_tool_data_table` kept one `hg38` row, so the form showed one choice. With this PR alone, every source that provides `hg38` (local, managed, IDC) adds its own identical `Human / hg38` entry to tool form and workflow editor payloads. Path resolution is still correct, because it takes the first match in source order. Only the choice list regresses.

<details><summary>Evidence</summary>

Two sources (`local.xml`, `managed.xml`) each define `all_fasta` with `hg38\tHuman\t/<source>/hg38.fa`, read with `<options from_data_table="all_fasta" />`:

```
PR head:            OPTIONS [('Human', 'hg38'), ('Human', 'hg38')]   PATH ['/local/hg38.fa']
origin/release_26.1: OPTIONS [('Human', 'hg38')]                     PATH ['/local/hg38.fa']
```

`git grep get_display_options origin/release_26.1 -- lib` finds nothing, so `to_dict` serializes these raw options as they are. The new `test_merged_data_table_filters_versions_before_resolving_value` only covers a `static_value` filter that narrows the rows to one.

</details>

Land #24323 first, or say in the description that this PR depends on it. Don't copy the collapse here as well. #24323 deliberately collapses only at the display layer and keeps raw `get_options` duplicated for validation aliases. A test of unfiltered raw `get_options` would therefore contradict #24323's design. The coverage belongs with #24323's display-option tests.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: `ToolDataTableManager` keeps two parallel load/reload/register modes (implementation verified)

`__init__`, `reload_tables` and `add_new_entries_from_config_file` each branch on `self.config_sources is None`.

- Galaxy's app uses the new ordered-sources path: a staged rebuild plus `on_registration`.
- The Tool Shed app, `ValidationContext`, `galaxy_mock` and `galaxy-tool-util` consumers (planemo) still use `config_filename` with `reload_from_files` / `_merged_load_info`.

The two modes differ in source order, duplicate handling and error reporting. With `config_sources` set, `_merged_load_info` is still filled but never read. The modes could also be combined. With both arguments, the `config_filename` tables loaded outside the sources, and the next full `reload_tables()` silently dropped them.

On a release branch, the minimal fix is to reject the combination. Commit `18869533bc8` on `pr_24396_review_0` raises `ValueError` when both are passed. Its test fails without the guard. Fully unifying on ordered sources is a `dev` change. See the follow-up refactor issue.

<details><summary>Details</summary>

The end state: `__init__` normalizes `config_filename` (and `tool_data_table_config_path_set`) into `[ToolDataTableConfigSource(f) for f in listify(config_filename)]`. The legacy branches and the `reload_from_files` / `_merged_load_info` replay then go. `persist=False` callers (Tool Shed install validation) use the staging manager directly.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: Source-order logic lives in the app and is tested only through a hand-bound Mock app (implementation verified)

`MinimalGalaxyApplication._configure_tool_data_tables` turns config into a `List[ToolDataTableConfigSource]` with no side effects. It handles realpath/normcase identity, collapses repeats of the managed file, marks the default managed file `optional`, and appends it last when it isn't listed. Even so, the code sits in the app and builds the managed source twice. `test_ordered_data_tables.py::make_app` exercises it only by building `Mock(spec=UniverseApplication)` and binding `MinimalGalaxyApplication` methods onto it by hand.

Commit `8a81e018c2f` on `pr_24396_review_0` moves the logic into `galaxy.tool_util.data.tool_data_table_config_sources(config_paths, managed, from_shed_config, managed_optional)`. The app becomes one call. Direct tests in `test/unit/tool_util/data/test_tool_data.py` cover symlink aliases, a repeated managed file, empty entries, comma-string config and the unlisted or optional managed file. The `make_app` harness is unchanged on the branch. Moving the ordering and registration tests to `ToolDataTableManager(config_sources=..., on_registration=recorder)`, as `test_refgenie_data_table.py` already does, is listed in the follow-up issue.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 4: No integration test of configured order through a real registration (implementation verified)

No test runs the real app with a list-valued `tool_data_table_config_path` that places the managed file ahead of other sources, then registers into that slot and checks row order through `/api/tool_data/{table}`. A startup-only check would pass on `release_26.1` too, because the base already honors list order at startup. The base bug appears only after a runtime registration, which appends managed rows at the end.

Commit `9f55343196d` on `pr_24396_review_0` adds `test/integration/test_tool_data_source_order.py`. It configures `[managed.xml, external.xml]`, calls `add_new_entries_from_config_file(..., persist=True)` on the running app (no Tool Shed needed), and asserts `["/incoming", "/external"]` from the API before and after `reload_tables()`. It passes on the branch. With `lib/galaxy` checked out from `origin/release_26.1`, it fails with `['/external', '/incoming']`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: A reload failure after persisting escapes the `(elems, error_message)` contract (implementation verified)

`_register_from_config_file` writes the managed XML, then calls `self.reload_tables(names)` outside any `try`. That reload re-parses every configured source, so an unrelated admin XML that has broken since startup also raises. `InstallRepositoryManager` (`install_manager.py`, the `add_new_entries_from_config_file(..., persist=True)` call) doesn't catch it. The install aborts after the repository row is committed and the XML is written. The legacy path never reloaded after writing, so it had no such failure.

Commit `8016fa7a5b1` on `pr_24396_review_0` catches the error, logs it and returns the registered elements with an error message. Peers are still notified from the existing `finally`. `test_failed_reload_keeps_table_state_and_notifies_after_persist` now checks the exact message, the written XML, the unchanged live table and the peer notification, where it previously checked for the raise. It fails without the fix.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Extra location-file directories are watched recursively (implementation verified)

`ConfigWatchers.tool_data_paths` now adds the parent directory of every non-transient loc file. `start()` and `update_watch_data_table_paths` watch each of them with `recursive=True`. Recursion suits `tool_data_path` and `shed_tool_data_path`. For an arbitrary loc file's parent, such as a genomes mount with loc files at its root, it puts a recursive watch on the whole reference tree. Directories nested under `tool_data_path` were also watched a second time. Only the md5 path-hash dedup hid that. This applies only with `watch_tool_data_dir` enabled.

Commit `15e4d202e7f` on `pr_24396_review_0` watches only the two configured roots recursively. Other loc directories are watched non-recursively, and directories under a root are skipped. The watcher test now uses a directory that is really outside `tool_data_path` and asserts `recursive is False`. It also checks that a directory nested under the root isn't watched again. The test fails without the fix.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Duplicated watcher callback and a type-compatibility assert that can't fail (implementation verified)

- The `reload_tool_data_tables` watcher lambda appears in both `ConfigWatchers.start()` and `update_watch_data_table_paths`, with `require_extensions=(".loc",)` and `recursive=True`.
- `assert type(existing) is type(x) or (both TabularToolDataTable)` appears in both `_register_from_config_file` and `_reload_from_config_sources`. Every registered table type (`TabularToolDataTable` and Galaxy's `RefgenieToolDataTable`) subclasses `TabularToolDataTable`, so the assert can never fail.

Commit `a774950b479` on `pr_24396_review_0` extracts `_watch_tool_data_dir` and drops both asserts. That includes the separate pre-publish loop in `_reload_from_config_sources` that existed only to run the assert.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: One control task per table on registration (implementation verified)

`_tool_data_tables_registered` sends a separate `reload_tool_data_tables` control task for each table name. Each task makes every peer re-parse every configured source XML and serialize every table element. `shed_tool_data_table_conf.xml` is large on big instances. `reload_tables` already accepts a list, and so does the `release_26.1` version that older peers run during a rolling restart.

Commit `f9b0f84cc90` on `pr_24396_review_0` sends a single task with `table_name=[...]`. The new `test_multi_table_registration_sends_one_peer_reload` registers two tables and replays the sent kwargs on a peer. It fails without the fix.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: In-place `__class__`/`__dict__` swap is inlined in the reload loop (implementation verified)

`_reload_from_config_sources` publishes a rebuilt table with `existing.__class__ = type(rebuilt); existing.__dict__ = rebuilt.__dict__`, so references held by tools and dynamic options stay valid across a Refgenie/tabular switch. That's an implicit contract. A future `__slots__` attribute or cached property would break it. Commit `1a66bf5f2d2` on `pr_24396_review_0` moves the swap into one documented `ToolDataTable._replace_with(other)`. Resolving tables by name instead of holding references is part of the follow-up issue.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: Function-level imports in the new tests (implementation verified)

`test_ordered_data_tables.py` imports `ConfigWatchers` (twice), `MockApp`, `DynamicOptions`, `ParameterOption`, `XML`, `Bunch`, `WorkRequestContext`, `ToolDataTableManager`, `pathlib.Path` and `.test_data_manager_reload._data_manager` inside test bodies. `test_install_manager.py::test_install_rebuilds_tables_in_configured_order` does the same with `galaxy.tool_util.data`. Commit `68e15f68ec9` on `pr_24396_review_0` moves them all to module top. Both modules still pass.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 7: `ToolDataTableConfig` names a single read source (implementation verified)

The parameter is `config_sources` and the docstring says "A read source", but the class is named `ToolDataTableConfig`, which reads like the whole configuration. Commit `8d8935d2e2d` on `pr_24396_review_0` renames it to `ToolDataTableConfigSource` in all four places it's used, before the name ships in `galaxy-tool-util`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
