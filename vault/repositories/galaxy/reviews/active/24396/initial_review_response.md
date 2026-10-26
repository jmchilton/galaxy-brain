Did my agent catch on performance problem for yours for a change? Or do we actually want to watch those directories recursively? My brain has been scattered so this review is a bit dis-jointed - take only what makes sense please. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment, Opus 5.5, low effort, reviewed `770965bef62` against `origin/release_26.1`.

The main one-way risk is that this fixes a new admin-facing contract on a release branch: the order of `tool_data_table_config_path` now sets data table precedence, the shed file can be placed explicitly in that list, and same-value rows from different sources are kept instead of the first one winning. Admin configs and IDC/CVMFS deployments will come to rely on this.

<details><summary>Risk Details</summary>

- Precedence semantics become documented config behavior: earlier files win, the shed file loads last unless listed, symlinked/equivalent paths load once at the first position. Changing this later would silently change which reference rows tools resolve.
- `merge_tool_data_table` no longer drops a row whose `value` is already registered. Only identical rows are skipped now. Tables merged from several sources can hold several rows with the same `value`, and `get_field`/`get_entry`-style lookups that assume unique values may return a different row or show duplicates in tool selects.
- An explicitly set `shed_tool_data_table_config` that is missing is now an error at startup and reload. Only the default path is optional. Existing deployments with a configured but missing file may fail to start after a minor-release upgrade.
- Reload is rebuilt around full config sources: every path-triggered reload re-parses all source XML files, and there is new change-detection state (`_loaded_config_definitions`). Live tables are swapped in place through `existing.__class__`/`__dict__` assignment, which is fragile if anything holds a reference that depends on the old type (Refgenie and tabular).
- Shed registration now stages, validates, writes XML, reloads, then broadcasts per-table `reload_tool_data_tables` control tasks and updates watchers. Other processes depend on these new messages, so in a mixed-version rolling restart the order can briefly disagree between processes.
- Watchers now also watch every non-transient `.loc` directory referenced by any table, recursively. On large reference mounts (CVMFS, IDC) this can add many watched directories and inotify load.
- `to_xml_file` switched `abspath` to `realpath`, so writes now go to the symlink target.
- Only two-way: changing order requires a restart, and the old two-argument path (`config_filename`) remains for non-app callers.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that keeping same-value rows from different sources is intended for a release branch. It reverses the earlier "first value wins" dedup and may surface duplicate genome builds in tool selects. Check also whether the new hard error for a missing explicitly configured shed file is acceptable for a point release.

Look closely at `_reload_from_config_sources` (the in-place `__class__`/`__dict__` swap, and the cost of re-parsing all sources on every `.loc` change) and at the recursive watcher expansion against large mounted reference data. Someone running a multi-process deployment (usegalaxy.*) should sanity-check the new control-task broadcast during installs and data-manager runs.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human. The same fixes, plus the test rewrite from P2 3, are offered as a PR against your branch: https://github.com/mvdbeek/galaxy/pull/37.

<details><summary>Branch and Commit Details</summary>

[`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) starts from the reviewed commit [`770965bef62`](https://github.com/jmchilton/galaxy/commit/770965bef62) and keeps every change small enough for a release branch. It renames the source dataclass to `ToolDataTableConfigSource`. It rejects managers built with both `config_sources` and `config_filename`, and moves the source-ordering logic out of the app into a tested `galaxy.tool_util.data` function. A reload failure after a registration is persisted is now reported through `error_message`, so it no longer aborts the install. Location-file directories outside the configured roots are watched non-recursively. Peers get a single reload task per registration. The in-place table swap is named, and the type asserts that couldn't fail are gone, along with the duplicated watcher setup. A new integration test checks the configured order end to end. Each behavior change has a test that fails without it. All PR-touched unit modules pass, and mypy is clean on the three touched library modules. Full unification of the two manager modes is left to the follow-up issue.

- [`8d8935d2e2d`](https://github.com/jmchilton/galaxy/commit/8d8935d2e2d) Rename ToolDataTableConfig to ToolDataTableConfigSource. The name now matches the `config_sources` parameter (P3 7).
- [`18869533bc8`](https://github.com/jmchilton/galaxy/commit/18869533bc8) Reject config_sources combined with config_filename. Raises `ValueError` in `ToolDataTableManager.__init__`, with a test in `test_tool_data.py` (P2 2).
- [`8a81e018c2f`](https://github.com/jmchilton/galaxy/commit/8a81e018c2f) Move tool data table source ordering into tool_util. Adds `tool_data_table_config_sources()`, makes the app a single call, and adds direct tests for aliases, repeats and the unlisted or optional managed file (P2 3).
- [`8016fa7a5b1`](https://github.com/jmchilton/galaxy/commit/8016fa7a5b1) Report post-persist reload failures via error_message. Catches and logs the reload error, then returns the elements and a message. The existing test now asserts the message, the XML and the unchanged table instead of the raise (P3 1).
- [`a774950b479`](https://github.com/jmchilton/galaxy/commit/a774950b479) Deduplicate data table watcher setup; drop tautological type asserts. Adds the `_watch_tool_data_dir` helper and removes both copies of the always-true assert (P3 3).
- [`15e4d202e7f`](https://github.com/jmchilton/galaxy/commit/15e4d202e7f) Watch location file directories non-recursively. Only `tool_data_path` and `shed_tool_data_path` recurse, and directories under them are skipped. The watcher test is stricter (P3 2).
- [`f9b0f84cc90`](https://github.com/jmchilton/galaxy/commit/f9b0f84cc90) Send one peer reload control task per registration. Sends `table_name=[...]` and adds a two-table registration test (P3 4).
- [`1a66bf5f2d2`](https://github.com/jmchilton/galaxy/commit/1a66bf5f2d2) Name the in-place data table swap as ToolDataTable._replace_with. Puts the `__class__`/`__dict__` swap in one documented method (P3 5).
- [`68e15f68ec9`](https://github.com/jmchilton/galaxy/commit/68e15f68ec9) Move function-level test imports to module top. Covers `test_ordered_data_tables.py` and `test_install_manager.py` (P3 6).
- [`9f55343196d`](https://github.com/jmchilton/galaxy/commit/9f55343196d) Integration test: registration lands in configured managed slot. Checks `/api/tool_data` order after a live registration and after reload. Passes on the branch and fails against `release_26.1`'s `lib/galaxy` (P2 4).
- [`62a50f641ae`](https://github.com/jmchilton/galaxy/commit/62a50f641ae) Drop startup ordering test now covered by tool_data_table_config_sources tests. Removes `test_explicit_managed_position_loads_once` and the comma-string branch of `make_app` that only it used (P2 3).

</details>

</details>

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

On a release branch, the minimal fix is to reject the combination. Commit [`18869533bc8`](https://github.com/jmchilton/galaxy/commit/18869533bc8) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) raises `ValueError` when both are passed. Its test fails without the guard. Fully unifying on ordered sources is a `dev` change. See the follow-up refactor issue.

<details><summary>Details</summary>

The end state: `__init__` normalizes `config_filename` (and `tool_data_table_config_path_set`) into `[ToolDataTableConfigSource(f) for f in listify(config_filename)]`. The legacy branches and the `reload_from_files` / `_merged_load_info` replay then go. `persist=False` callers (Tool Shed install validation) use the staging manager directly.

</details>

Fix commit: [`18869533bc8`](https://github.com/jmchilton/galaxy/commit/18869533bc8).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: Source-order logic lives in the app and is tested only through a hand-bound Mock app (implementation verified)

`MinimalGalaxyApplication._configure_tool_data_tables` turns config into a `List[ToolDataTableConfigSource]` with no side effects. It handles realpath/normcase identity, collapses repeats of the managed file, marks the default managed file `optional`, and appends it last when it isn't listed. Even so, the code sits in the app and builds the managed source twice. `test_ordered_data_tables.py::make_app` exercises it only by building `Mock(spec=UniverseApplication)` and binding `MinimalGalaxyApplication` methods onto it by hand.

Commit [`8a81e018c2f`](https://github.com/jmchilton/galaxy/commit/8a81e018c2f) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) moves the logic into `galaxy.tool_util.data.tool_data_table_config_sources(config_paths, managed, from_shed_config, managed_optional)`. The app becomes one call. Direct tests in `test/unit/tool_util/data/test_tool_data.py` cover symlink aliases, a repeated managed file, empty entries, comma-string config and the unlisted or optional managed file. Commit [`62a50f641ae`](https://github.com/jmchilton/galaxy/commit/62a50f641ae) drops `test_explicit_managed_position_loads_once`, which those direct tests now cover; its only other assertion checked `_merged_load_info`. Since `test_ordered_data_tables.py` is new in this PR and test-only, please also drive its ordering and registration tests through `ToolDataTableManager(config_sources=..., on_registration=recorder)`, as `test_refgenie_data_table.py` already does, and keep one thin app-wiring test instead of binding `MinimalGalaxyApplication` methods onto `Mock(spec=UniverseApplication)`. That rewrite is in https://github.com/mvdbeek/galaxy/pull/37, not on `pr_24396_review_0`.

Fix commits: [`8a81e018c2f`](https://github.com/jmchilton/galaxy/commit/8a81e018c2f), [`62a50f641ae`](https://github.com/jmchilton/galaxy/commit/62a50f641ae) (harness rewrite left to the author).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 4: No integration test of configured order through a real registration (implementation verified)

No test runs the real app with a list-valued `tool_data_table_config_path` that places the managed file ahead of other sources, then registers into that slot and checks row order through `/api/tool_data/{table}`. A startup-only check would pass on `release_26.1` too, because the base already honors list order at startup. The base bug appears only after a runtime registration, which appends managed rows at the end.

Commit [`9f55343196d`](https://github.com/jmchilton/galaxy/commit/9f55343196d) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) adds `test/integration/test_tool_data_source_order.py`. It configures `[managed.xml, external.xml]`, calls `add_new_entries_from_config_file(..., persist=True)` on the running app (no Tool Shed needed), and asserts `["/incoming", "/external"]` from the API before and after `reload_tables()`. It passes on the branch. With `lib/galaxy` checked out from `origin/release_26.1`, it fails with `['/external', '/incoming']`.

Fix commit: [`9f55343196d`](https://github.com/jmchilton/galaxy/commit/9f55343196d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: A reload failure after persisting escapes the `(elems, error_message)` contract (implementation verified)

`_register_from_config_file` writes the managed XML, then calls `self.reload_tables(names)` outside any `try`. That reload re-parses every configured source, so an unrelated admin XML that has broken since startup also raises. `InstallRepositoryManager` (`install_manager.py`, the `add_new_entries_from_config_file(..., persist=True)` call) doesn't catch it. The install aborts after the repository row is committed and the XML is written. The legacy path never reloaded after writing, so it had no such failure.

Commit [`8016fa7a5b1`](https://github.com/jmchilton/galaxy/commit/8016fa7a5b1) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) catches the error, logs it and returns the registered elements with an error message. Peers are still notified from the existing `finally`. `test_failed_reload_keeps_table_state_and_notifies_after_persist` now checks the exact message, the written XML, the unchanged live table and the peer notification, where it previously checked for the raise. It fails without the fix.

Fix commit: [`8016fa7a5b1`](https://github.com/jmchilton/galaxy/commit/8016fa7a5b1).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Extra location-file directories are watched recursively (implementation verified)

`ConfigWatchers.tool_data_paths` now adds the parent directory of every non-transient loc file. `start()` and `update_watch_data_table_paths` watch each of them with `recursive=True`. Recursion suits `tool_data_path` and `shed_tool_data_path`. For an arbitrary loc file's parent, such as a genomes mount with loc files at its root, it puts a recursive watch on the whole reference tree. Directories nested under `tool_data_path` were also watched a second time. Only the md5 path-hash dedup hid that. This applies only with `watch_tool_data_dir` enabled.

Commit [`15e4d202e7f`](https://github.com/jmchilton/galaxy/commit/15e4d202e7f) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) watches only the two configured roots recursively. Other loc directories are watched non-recursively, and directories under a root are skipped. The watcher test now uses a directory that is really outside `tool_data_path` and asserts `recursive is False`. It also checks that a directory nested under the root isn't watched again. The test fails without the fix.

Fix commit: [`15e4d202e7f`](https://github.com/jmchilton/galaxy/commit/15e4d202e7f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Duplicated watcher callback and a type-compatibility assert that can't fail (implementation verified)

- The `reload_tool_data_tables` watcher lambda appears in both `ConfigWatchers.start()` and `update_watch_data_table_paths`, with `require_extensions=(".loc",)` and `recursive=True`.
- `assert type(existing) is type(x) or (both TabularToolDataTable)` appears in both `_register_from_config_file` and `_reload_from_config_sources`. Every registered table type (`TabularToolDataTable` and Galaxy's `RefgenieToolDataTable`) subclasses `TabularToolDataTable`, so the assert can never fail.

Commit [`a774950b479`](https://github.com/jmchilton/galaxy/commit/a774950b479) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) extracts `_watch_tool_data_dir` and drops both asserts. That includes the separate pre-publish loop in `_reload_from_config_sources` that existed only to run the assert.

Fix commit: [`a774950b479`](https://github.com/jmchilton/galaxy/commit/a774950b479).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: One control task per table on registration (implementation verified)

`_tool_data_tables_registered` sends a separate `reload_tool_data_tables` control task for each table name. Each task makes every peer re-parse every configured source XML and serialize every table element. `shed_tool_data_table_conf.xml` is large on big instances. `reload_tables` already accepts a list, and so does the `release_26.1` version that older peers run during a rolling restart.

Commit [`f9b0f84cc90`](https://github.com/jmchilton/galaxy/commit/f9b0f84cc90) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) sends a single task with `table_name=[...]`. The new `test_multi_table_registration_sends_one_peer_reload` registers two tables and replays the sent kwargs on a peer. It fails without the fix.

Fix commit: [`f9b0f84cc90`](https://github.com/jmchilton/galaxy/commit/f9b0f84cc90).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: In-place `__class__`/`__dict__` swap is inlined in the reload loop (implementation verified)

`_reload_from_config_sources` publishes a rebuilt table with `existing.__class__ = type(rebuilt); existing.__dict__ = rebuilt.__dict__`, so references held by tools and dynamic options stay valid across a Refgenie/tabular switch. That's an implicit contract. A future `__slots__` attribute or cached property would break it. Commit [`1a66bf5f2d2`](https://github.com/jmchilton/galaxy/commit/1a66bf5f2d2) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) moves the swap into one documented `ToolDataTable._replace_with(other)`. Resolving tables by name instead of holding references is part of the follow-up issue.

Fix commit: [`1a66bf5f2d2`](https://github.com/jmchilton/galaxy/commit/1a66bf5f2d2).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: Function-level imports in the new tests (implementation verified)

`test_ordered_data_tables.py` imports `ConfigWatchers` (twice), `MockApp`, `DynamicOptions`, `ParameterOption`, `XML`, `Bunch`, `WorkRequestContext`, `ToolDataTableManager`, `pathlib.Path` and `.test_data_manager_reload._data_manager` inside test bodies. `test_install_manager.py::test_install_rebuilds_tables_in_configured_order` does the same with `galaxy.tool_util.data`. Commit [`68e15f68ec9`](https://github.com/jmchilton/galaxy/commit/68e15f68ec9) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) moves them all to module top. Both modules still pass.

Fix commit: [`68e15f68ec9`](https://github.com/jmchilton/galaxy/commit/68e15f68ec9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 7: `ToolDataTableConfig` names a single read source (implementation verified)

The parameter is `config_sources` and the docstring says "A read source", but the class is named `ToolDataTableConfig`, which reads like the whole configuration. Commit [`8d8935d2e2d`](https://github.com/jmchilton/galaxy/commit/8d8935d2e2d) on [`pr_24396_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24396_review_0) renames it to `ToolDataTableConfigSource` in all four places it's used, before the name ships in `galaxy-tool-util`.

Fix commit: [`8d8935d2e2d`](https://github.com/jmchilton/galaxy/commit/8d8935d2e2d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Suggested Follow-Up Refactoring for dev</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

```markdown
# Unify ToolDataTableManager on ordered config sources

After #24396, `ToolDataTableManager` (`lib/galaxy/tool_util/data/__init__.py`) has two modes:

- **Legacy `config_filename`:** per-file load and merge, plus per-table `reload_from_files` replay of `_load_info` / `_merged_load_info`. The Tool Shed app, `ValidationContext`, `galaxy_mock` and `galaxy-tool-util` consumers such as planemo use this mode.
- **`config_sources`:** ordered sources, a staged rebuild, and `on_registration`. Only Galaxy's app uses this mode.

The two modes differ in source order, duplicate handling and error reporting, and `_merged_load_info` is still filled but unused in the new mode. The plan below targets `dev`.

1. In `__init__`, normalize `config_filename` and `tool_data_table_config_path_set` into `List[ToolDataTableConfigSource]` (e.g. via `tool_data_table_config_sources`), and drop the legacy load loop.
2. Delete the legacy branches in `reload_tables` and `add_new_entries_from_config_file`, together with `ToolDataTable.reload_from_files` / `_merged_load_info`. `persist=False` callers (Tool Shed install validation) should use the staging manager directly.
3. Replace the in-place `__class__`/`__dict__` publish (`ToolDataTable._replace_with`) with name-based lookups. This means auditing the callers that hold `ToolDataTable` references, such as dynamic options and data managers.
4. Consider having `DataManager._reload` use the same single batched peer-notification hook that registrations use.
5. Check how planemo and the Tool Shed use `ToolDataTableManager(config_filename=...)` for behavior changes, in particular source order and the non-identical same-value rows that are now kept.
```

</details>
