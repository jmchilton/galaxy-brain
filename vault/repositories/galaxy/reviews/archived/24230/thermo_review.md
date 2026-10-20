# Thermo review: galaxyproject/galaxy#24230

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Opus 5.5, high effort
- Reviewed commit: `a8f82487b93a8c72629c6ae859e38afaa3df0d49` (21 commits, diff vs `origin/release_26.2`)
- Scope: reuse and refactoring only. The code was not run, and bugs were not hunted.

## Summary

The PR adds about 400 lines outside tests and fixes 10 measured performance and correctness problems. Several changes are good consolidations:
- `_build_stores` now derives from `conf_to_store_map`.
- `INDEX_WRITE_LOCK_TIMEOUT` moved to the shared module.
- The data manager store write moved into `SqlAlchemyToolSourceStore`, which is the right layer.
- `TestCachedRepositoryInstallIntoReadOnlyStoreConf` reruns the existing install suite through a `ClassVar` instead of copying it.

Most of my findings have one shape. A rule is either written out again where an owner already exists, or enforced at some call sites and not others:
- the single-writer rule for the search index
- the guid-or-id registry id
- the `only_paths`/`exclude_paths` filter
- "is this read-only store unavailable"
- "is this the cached toolbox"
- "has the store changed"

Each fix touched one site and left its siblings to drift. No P1s.

File size: no file crosses 1k lines because of this PR. `cached_toolbox.py` (1870 → 1901) and `populator.py` (1223 → 1245) were already over the limit. The populator addition still lands in the middle of the already long `_populate_store_inline_unlocked` (see P2 5).

## Findings

### P2 1: The single-writer rule for the search index is applied by callers, and one caller skips it

`queue_worker._writes_tool_search_index` gates `rebuild_toolbox_search_index` and now `reload_tool_source_cache`. `tool_panel_manager` dropped its direct `reindex_tool_search()`.

`CachedToolBox.remove_tool_by_id` (`cached_toolbox.py:1730`) still calls `self.app.reindex_tool_search()` unconditionally, in whichever process served the uninstall. It broadcasts with `noop_self=True`, so when that process is not the watcher, both it and the watcher write the index. This contradicts fix #7 in the PR body: "Only the elected config watcher reindexes now".

The rule lives in a module-private helper in the message-handler module, so every future caller must remember it. `reindex_tool_search` has only two callers, both on the cached path, so the rule can move into the canonical method:
- Put it in `UniverseApplication.reindex_tool_search` / `ensure_tool_search_index`, or behind an app property such as `writes_tool_search_index` next to `is_job_handler`.
- Then all three sites call one method, `remove_tool_by_id` behaves correctly in both the watcher and non-watcher cases, and `_writes_tool_search_index` disappears.

### P2 2: Eager and cached search now handle a locked index differently

- Cached: `CachedToolboxSearch.build_index` catches `LockError` and resets `self.indexed_reload_count = None` so a later rebuild retries. It reaches directly into base-class state, beside the base's `_mark_built`.
- Eager: `ToolPanelViewSearch.build_index` (`search/__init__.py:304-311`) catches the same `LockError`, logs the same warning string, and returns. `ToolBoxSearch.build_index` then calls `_mark_built`, so the eager path still treats a blocked build as done.
- Comments: the comment on `INDEX_WRITE_LOCK_TIMEOUT`, which moved verbatim into `source_store/search.py`, still says the lock holder "is writing the same documents". The new cached comment says the other writer "may hold an older corpus". Both cannot be true.

Suggested fix:
- Have each panel build return or raise one outcome.
- Let the `ToolBoxSearch` base own "mark built only if every panel built", with a `_mark_stale()` counterpart to `_mark_built`.
- Keep a single warning helper, and fix the moved comment so the two paths share one stated policy.

### P2 3: The guid-or-id data manager rule now has three copies, and fix #10 came from them disagreeing

- `DataManager.id` → `self.guid or self.declared_id` (`data_manager/manager.py:206`)
- `discover._iter_data_manager_tools` → `dm_elem.get("guid") or dm_elem.get("id")` (new, `discover.py:350`)
- `tool_util/data/bundles/repository.py:200` → `dm_elem.get("guid") or dm_elem.get("id") or ""`

The bug in #10 is that discovery reimplemented `DataManager._load_from_element` and got the id wrong. More broadly, `_iter_data_manager_tools` is a shadow parser of the `<data_manager>` element: `tool_file` versus nested `<tool>`, `shed_conf_file` → `tool_path`, and the planemo fallback.

Suggested fix: add one small parse in `galaxy.tool_util`, the lowest layer all three can import. For example, `parse_data_manager_elem(elem) -> DataManagerDecl(registry_id, tool_file, tool_guid, shed_conf_file)`. `DataManager`, discovery and bundles would all consume it, which removes the class of bug rather than this one instance.

### P2 4: `only_paths` / `exclude_paths` repeats one inline predicate about 7 times (code-judo)

`discover_tools_from_config` gains two parameters, and the same `(only_paths is not None and p not in only_paths)` / `(exclude_paths is not None and p in exclude_paths)` checks appear in:
- the `<tool>` pre-resolve loop
- the `tool_dir` guard
- the `tool_dir` candidate loop
- the bundled sweep
- the hidden-lib sweep
- the data-manager sweep
- the converter sweep

Three of these were reformatted into multi-line `or` chains to fit.

Suggested fix: one `PathSelection` value object, a small frozen dataclass. It needs `admits(path)` and `may_contain(directory)` (for the `tool_dir` prefix check), and `None` means "everything". Pass one argument instead of two, and each site becomes `if not selection.admits(path): continue`. This also gives P2 5 a natural place for per-conf exclusions.

### P2 5: The second conf walk for read-only-routed confs is a special case inside an already busy function

The new block in `_populate_store_inline_unlocked`:
- iterates `conf_to_store` again
- calls `list_source_paths()` on each read-only store
- re-walks each such conf with `discover_tools_from_config` and `exclude_paths`
- appends the results to both `discovered_tools` and `tool_specs`

As a result the function now builds its tool list in two different ways.

Code-judo option: treat this as routing, not a second discovery.
1. Run `discover_tools` once over the writable confs plus the read-only confs that have an available index.
2. Route each tool through one function, `effective_store(d)`: the conf's store, or `DEFAULT_STORE_NAME` when that store is read-only and does not hold `d.path`.

The second walk, the `discover_tools_from_config` import and the append-to-two-lists step all disappear. At minimum, extract the block into a named helper.

The block also has two consistency problems with existing code:
- It recognises an unavailable store with `isinstance(store, UnavailableToolSourceStore)`. `CompositeToolSourceStore.unavailable_read_only_member_names` already models this concept as `load_index() is None`, and that also covers a read-only store whose index has a stale schema. The two definitions now disagree. The toolbox turns off its fast panel path for a stale-schema store, while the populator spills that store's tools to the default store.
- The boot coverage check (`cached_toolbox.py:781-790`) still leaves read-only-routed confs out entirely. Its `read_only_member_names` docstring says a miss there "can never be healed by running the populator". This PR makes the populator heal exactly that case, so the coverage check and the populator now define "covered" differently. If they should match, the same `effective_store` routing would let the coverage check reuse the rule. If they should differ, update that docstring.

### P2 6: The tool shed install code branches on `isinstance(toolbox, CachedToolBox)`, and this PR removes the same pattern elsewhere

The last commit gives every `ToolBox` a no-op `batch_index_writes()` context, so `DataManagers` need not know about the cached toolbox. `installed_repository_metadata_manager.get_repository_tools_tups` does the opposite:
- It imports `galaxy.tools.cached_toolbox` into `galaxy.tool_shed`, behind an `InstallationTarget` whose toolbox is typed `AbstractToolBox`.
- It branches on `isinstance`.
- Its sibling `tool_panel_manager.add_to_tool_panel` decides the same mode with `config.use_cached_toolbox`, so the two install files use different checks.

The new block also computes each tool's path itself with `os.path.abspath(os.path.join(tool_path or "", relative_path))`. The loop directly below recomputes the same path for `load_tool`. `_collect_new_tool_paths` in `tool_panel_manager` already maps tool paths to guids, and its docstring says those paths must go through `resolve_tool_path` to match discovery byte for byte.

Suggested fix:
- Make `index_tool_files` a polymorphic hook (a no-op on `ToolBox`, or on the `AbstractToolBox` protocol the shed code sees), consistent with `batch_index_writes`.
- Build the `(path, relative_path, guid)` list once, index it, and load from it.
- Derive paths the way `_collect_new_tool_paths` does, so the paths indexed here match the ones the later conf-driven populate writes.
- Optionally, `tool_panel_manager`'s `populate_for_paths` + `invalidate_index_cache` pair could also go through `index_tool_files`. It is the third caller of the same two-step sequence, after `_populate_adhoc_path` and this one.

### P3 1: The stat-signature cache is a second "store changed" mechanism

`SqlAlchemyToolSourceStore` gains a `_database_signature()` built from the database file's `(inode, size, mtime_ns)` plus the `-wal` file, and `invalidate_index_cache` now sometimes does nothing. The store package already has this concept: `FreshnessProbe` (`freshness.py`) and `ToolSourceStoreWatcher` (`watcher.py`), which polls read-only stores' probes for CVMFS republishes.

A database-file probe is arguably the signal the watcher wants for a published bundle, and could replace `tool_confs` for read-only stores. As written, the probe and the new stat check can disagree about whether a store changed. Suggestions:
- Express the signature as a probe or token in `freshness.py` and compare tokens.
- Replace the bare `tuple[_FileSignature, _FileSignature | None]` with a small NamedTuple.
- In the read-only branch, call `self.dispose()` instead of repeating its body.
- `watcher.py`'s module docstring still says engine disposal "belong[s] to the toolbox callback owner", which this PR moves into the store. Update it.

### P3 2: `batch_index_writes` has a generic name but defers only data manager id stamps

The context lives on the 5000-line base `ToolBox`, but only `_stamp_data_manager_id` honours it. `remove_index_entry`, populates and other entry writes inside the block are not batched, and the flush logs "Persisting data_manager_id". It also adds nullable-mode state (`_deferred_index_entries`) that changes how `_stamp_data_manager_id` behaves, and the seam test fixture now has to set it by hand.

Either name it for what it does (`batch_data_manager_id_stamps`) or route all entry persistence through it.

Larger question: the stamp-and-persist machinery exists because `data_manager_id` is a denormalised copy of the live `DataManagers` registry, which every Galaxy process loads. Could `DataManagerTool` resolve its manager from the registry by tool id or guid (a `tool → manager` map filled in `add_manager`)? The persisted field, the load-time stamping, the reentrant batch context and the base-class hook would then all go away. The design predates this PR, but the PR adds to it.

### P3 3: Comments the PR adds or moves now contradict its own changes

- `ToolWhooshIndex.build`: "Every process reindexes after a reload broadcast and writes this directory". Fix #7 makes this false.
- The moved `INDEX_WRITE_LOCK_TIMEOUT` comment (see P2 2).
- `_schema_without_doc_hash` is a permanent upgrade-shim branch in `_open`. A one-line note on when it can be removed would keep it from becoming permanent debt.

## Risks

Mostly a two-way door. The Whoosh index can be rebuilt, the memory and write-pattern changes are internal, and the persisted index format and `INDEX_SCHEMA_HASH` are unchanged and pinned by a test.

<details><summary>Risk Details</summary>

- When a data manager loads, every process rewrites persisted `data_manager_id` values in the shared default store's index to the guid-or-id registry key. Repopulating corrects a wrong value, but it is still a durable change to shared state, made from load paths rather than the populator.
- Tools installed into a conf routed to a read-only store now persist in the writable default store, with conf context. That is a new routing policy (a read-only store's gaps spill to the default store) that later store work will build on.
- The single-writer policy for the search index changes which processes write `tool_search_index_dir`. Deployments whose processes do not share that directory would stop getting indexes outside the watcher. As written, `remove_tool_by_id` still writes from any process (P2 1).

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the spill-to-default routing for read-only stores is the intended long-term model, and decide whether the boot coverage check should follow it (P2 5). They should also check that `tool_search_index_dir` is genuinely shared in every supported multi-process layout before making the config watcher its only writer.

</details>
