These look worth addressing maybe. I'm not sure the agent's suggested tests are strong enough so maybe just a starting point here. -John

Fix branch: `pr_24230_fix_0` based on the reviewed commit; pushed to [jmchilton/galaxy](https://github.com/jmchilton/galaxy/tree/pr_24230_fix_0).
  - [`dda040ae17e`](https://github.com/jmchilton/galaxy/commit/dda040ae17ec6891cbe5f1042319c21a71b6ea6e) Gate tool search index writes in the app, not at call sites (P2 1)
  - [`843ad7a641e`](https://github.com/jmchilton/galaxy/commit/843ad7a641e3a36b56da1bf3f8003ea21e8b4be9) Make index_tool_files a toolbox hook that indexes only misses (P2 2)
  - [`3d61aa6297e`](https://github.com/jmchilton/galaxy/commit/3d61aa6297e449b9f4c5c28d1090ed4adba0b6ec) Update comments the single-writer and read-only spill changes made stale (P3 2)
  - [`dbf47074a4b`](https://github.com/jmchilton/galaxy/commit/dbf47074a4bae4e91e03fc1c2afeaf39fddff39c) Import populator at the top of test_populate_store (P3 8)
- Tests: the new tests were red on the reviewed commit and are green on the branch. The related unit suites pass: `source_store/`, `test_cached_tool.py`, `scripts/tool_source/`, `test_toolbox.py`, `test_toolbox_search.py` and the new `queue_worker/test_tool_search_index_writer.py`, 313 tests in all. Mypy reports no errors in the touched modules. `test_galaxy_install.py::test_against_production_shed` fails locally because `hg` is missing; it never reaches the changed code.
- CI: there are three failures, all unrelated. The package tests on 3.10 and 3.14 fail on a mypy error in `tool_shed/webapp/fast_app.py:179`, a file the PR doesn't touch. The Playwright failure is a `test_workflow_run` history-item timeout.

### P2 1: Search index still has a second writer: `remove_tool_by_id` reindexes outside the config watcher (implementation verified)

Fix #7 makes the elected config watcher the only writer of `tool_search_index_dir`, but it enforces that at call sites. It gates the `reload_tool_source_cache` handler and drops the install-time reindex. `CachedToolBox.remove_tool_by_id` (`lib/galaxy/tools/cached_toolbox.py:1730`) still calls `self.app.reindex_tool_search()` in whichever process served the uninstall. On a non-watcher web worker, both that process and the watcher (reacting to the `noop_self=True` broadcast) write the index. With incremental builds, each writer computes its delete/update diff from its own in-memory index, so a lagging non-watcher can commit last and delete documents for tools a peer just installed. No test covers the watcher-only rule either. Integration tests run a single process, which is always the watcher.

<details><summary>Evidence</summary>

The new test `test_remove_tool_by_id_leaves_search_index_to_config_watcher` gives a non-watcher app the real `reindex_tool_search`. It fails on the reviewed commit with `Expected 'build_index' to not have been called. Called 1 times.` `reindex_tool_search` has only two callers, both on the cached path: the queue_worker handler and `remove_tool_by_id`.

</details>

Move the rule into the app so every caller obeys it. A `writes_tool_search_index` property sits next to `is_job_handler`. It is `False` on `GalaxyManagerApplication`, and on `UniverseApplication` it is `is_webapp and database_heartbeat.is_config_watcher`. `reindex_tool_search` and `ensure_tool_search_index` return early when it is false. `_writes_tool_search_index` in queue_worker goes away, and `reload_tool_source_cache` calls `reindex_tool_search()` unconditionally. Removals still converge: a non-watcher's broadcast reaches the watcher, and on the watcher itself the local call passes the gate.

<details><summary>Details</summary>

The fix commit adds `test/unit/app/queue_worker/test_tool_search_index_writer.py`. It covers the watcher/non-watcher/non-webapp cases for `reload_tool_source_cache` and `rebuild_toolbox_search_index`. It also adds the `remove_tool_by_id` test above.

</details>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at high effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort. Verified via Opus 5.5 at high effort.

### P2 2: The install pre-index branches on `isinstance(CachedToolBox)` and populates for every `get_repository_tools_tups` caller (implementation verified)

`installed_repository_metadata_manager.py:91-107` imports `CachedToolBox` into the shed layer. It then calls `toolbox.index_tool_files(...)` for every tool in the metadata, unconditionally. `get_repository_tools_tups` serves more than new installs:

- repository update (`install_manager.py:737`)
- activate (`installed_repository_manager.py:92`)
- metadata reset when the metadata changed (`update_in_shed_tool_config`)

Where the tools are already indexed, each of these now pays a populate, a fleet-wide `reload_tool_source_cache` broadcast and an index reload in every process. The per-tool miss path it replaced cost nothing on an index hit. The `isinstance` check also contradicts the PR's own last commit, which gave every `ToolBox` a no-op `batch_index_writes` precisely so callers don't ask "is this the cached toolbox?". The block also computes each tool path that the load loop below it recomputes.

<details><summary>Evidence</summary>

- `test_index_tool_files_populates_only_index_misses` fails on the reviewed commit: the populate receives the already-indexed path too.
- `test_index_tool_files_skips_populate_when_every_tool_is_indexed` also fails there: it populates even though every tool resolves.
- `AbstractToolBox.materialize_tool` (`tool_util/toolbox/base.py:1718`) is the existing no-op hook that this same shed method already calls without `isinstance`. `HasToolBox.toolbox` is typed `AbstractToolBox`.

</details>

Add `index_tool_files(path_guids: Mapping[str, str | None])` as a no-op on `AbstractToolBox` next to `materialize_tool`, and drop the import and the `isinstance` check. In the `CachedToolBox` override, keep only paths that exist on disk and whose guid the index doesn't hold. With nothing left, it doesn't populate or reload. Build the `(relative_path, guid, load_path)` list once, and use it for both indexing and loading.

<details><summary>Details</summary>

- **Why the filter checks the guid.** It doesn't use `_resolve_index_entry`. An update that bumps a tool's version rewrites the file in place, and the store still maps that path to the previous version. A path-based lookup would skip the populate and pair the new guid with the old tool. `test_index_tool_files_populates_version_bump_at_indexed_path` covers this. `_resolve_index_entry` stays only for guid-less paths.
- **Trade-off.** An update that keeps a tool's version keeps its indexed entry, as before the PR. The PR head re-indexed it, and the update path (`add_to_tool_panel(new_install=False)`) doesn't populate.
- **Stub toolboxes.** The shed's `TestToolBox` inherits the no-op.

</details>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at high effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort. Verified via Opus 5.5 at high effort.

### P3 1: A build skipped on `LockError` is retried only by the next tool event, and the eager path still marks it built

When `CachedToolboxSearch.build_index` hits `LockError`, it resets `indexed_reload_count = None` and relies on "the next `rebuild_toolbox_search_index`". It also reaches directly into base-class state beside `_mark_built`. Nothing schedules a retry. The index stays stale until the next install, uninstall, populate or toolbox reload, since the watcher's `reload_tool_source_cache` rebuilds unconditionally. The eager `ToolPanelViewSearch.build_index` catches the same `LockError` and returns, and `ToolBoxSearch.build_index` then calls `_mark_built`, so the two paths now state different policies for one situation.

<details><summary>Details</summary>

- **Lower than P2.** After P2 1 the only possible lock holders are a previous watcher, or a process mid-restart running old code, for longer than 60s. The window is narrow, and a later tool event heals it.
- **Eager path.** The eager handling predates this PR.
- **Not fixed.** A real retry needs a delayed control task or timer, which Galaxy's control-task layer lacks.

</details>

One cleanup: let each panel build report success, and have `ToolBoxSearch` own a `_mark_stale()` counterpart to `_mark_built`, used by both paths.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at high effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort.

### P3 2: Comments the PR added or moved contradict its changes (implementation verified)

- **`source_store/search.py`, `INDEX_WRITE_LOCK_TIMEOUT`.** The comment moved here still says a locked rebuild "can be skipped: the process holding the lock is writing the same documents". The cached path now leaves the index stale because the other writer may hold an older corpus.
- **`ToolWhooshIndex.build`.** It says "Every process reindexes after a reload broadcast and writes this directory", which fix #7 makes false.
- **`queue_worker` log.** "App is not a webapp, not building a search index" now also logs for webapps that simply aren't the watcher.
- **`CachedToolBox._index_needs_population` and `CompositeToolSourceStore.read_only_member_names`.** Both say a read-only-routed miss "can never be healed by the populator". Fix #9 makes the populator heal exactly that case, into the default store.
- **`source_store/watcher.py` module docstring.** It assigns engine disposal to the callback owner. `SqlAlchemyToolSourceStore.invalidate_index_cache` now does that itself.

The fix commit rewrites each one. It doesn't add a removal note for the `_schema_without_doc_hash` upgrade shim (thermo P3 3). When the shim can go depends on Galaxy's upgrade-support policy, which the author should state.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at high effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort. Verified via Opus 5.5 at high effort.

### P3 3: The guid-or-id data manager registry id now has three copies

The three copies are:

- `DataManager.id` → `guid or declared_id` (`data_manager/manager.py:206`)
- the new `discover._iter_data_manager_tools` → `dm_elem.get("guid") or dm_elem.get("id")`
- `tool_util/data/bundles/repository.py:200`

Fix #10 exists because discovery's shadow parse of `<data_manager>` disagreed with `DataManager`. The copies agree now, so this is about preventing a recurrence, not a live bug (thermo rated it P2). Suggested direction: a small `<data_manager>` element parse in `galaxy.tool_util` that all three consume. Not fixed, because choosing its home and shape is a design call, and the bundles copy predates the PR.

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort.

### P3 4: `only_paths` / `exclude_paths` repeats one inline predicate across `discover.py`

The two new parameters are checked inline in the `<tool>` pre-resolve loop, the `tool_dir` guard and candidate loop, and the bundled, hidden-lib, data-manager and converter sweeps. Three of those became multi-line `or` chains. A small frozen `PathSelection` with `admits(path)` and `may_contain(directory)` would collapse them. This is a readability refactor with no behavior change (thermo rated it P2). Not fixed.

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort.

### P3 5: The read-only spill is a second conf walk inside `_populate_store_inline_unlocked`, with its own "unavailable" test

The new block builds the tool list a second way:

1. It re-iterates `conf_to_store`.
2. It calls `list_source_paths()` per read-only store.
3. It re-walks each such conf with `exclude_paths`.
4. It appends to both `discovered_tools` and `tool_specs`.

It recognizes an unavailable store with `isinstance(store, UnavailableToolSourceStore)`. The toolbox instead uses `CompositeToolSourceStore.unavailable_read_only_member_names` (`load_index() is None`), which also covers a stale-schema read-only store. Thermo rated this P2; it is downgraded here because the definitional mismatch is benign. For a stale-schema SQLite store, `list_source_paths()` still returns its rows, so only tools missing from the store spill to the default store, not "that store's tools" as thermo stated. Those are the tools the eager walk would otherwise ad-hoc populate one at a time.

Suggested direction: extract the block into a named helper, or route each discovered tool through one `effective_store(d)` function. Not fixed, as a structural refactor. The stale coverage-check docstring part is fixed under P3 2.

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort.

### P3 6: The read-only stat signature is a second "store changed" mechanism

`SqlAlchemyToolSourceStore` now skips re-reading a read-only store while the `(inode, size, mtime_ns)` of its database and `-wal` is unchanged. `freshness.py` probes are the package's existing concept for the same question. `ToolSourceStoreWatcher` is never instantiated anywhere, so the two can't disagree in practice today. They could once a watcher is wired: a probe-reported change with an identical stat signature would be ignored.

Small tidies:

- The read-only branch repeats `dispose()`'s body.
- A NamedTuple would read better than the bare `tuple[_FileSignature, _FileSignature | None]`.

Not fixed, apart from the watcher docstring under P3 2.

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at high effort.

### P3 8: A new test imports `populator` inside the function (implementation verified)

`test_partial_populate_discovers_only_requested_paths` adds a function-level `from galaxy.tools.source_store import populator`, copying a sibling test. The module already imports from `populator` at the top. The fix moves both to the top.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at high effort. Verified via Opus 5.5 at high effort.
