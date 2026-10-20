	# Initial review: galaxyproject/galaxy#24230

- Profile: default
- Model: Opus 5.5, high effort
- Reviewed commit: `a8f82487b93a8c72629c6ae859e38afaa3df0d49`. The diff is `origin/release_26.2...HEAD`: 21 commits from merge-base `a11275030bff`.
- PR: "[26.2] Speed up cached toolbox shed installs and keep installed tools in the panel" (mvdbeek)

## Summary

The PR fixes ten things. Each fix is well motivated, measured and mostly well tested.

- **Data manager discovery:** each shed conf is parsed once.
- **Search index:** builds are incremental, using a per-document hash stored in the index. The index is upgraded in place.
- **Repository installs:** a repository's tools are indexed in one populate.
- **Read-only SQLite stores:** the index is re-read only when the database file's stat signature changes. The signature includes `-wal`.
- **Partial populates:** they discover only the requested paths.
- **Index entries:** the default entry and its version slot share one object on load.
- **Search writer:** only the config watcher writes the search index.
- **Whoosh writer:** `limitmb` is lowered to 32.
- **Read-only confs:** tools that the read-only store lacks are indexed into the default store, with their conf context.
- **Data manager ids:** the registry id is guid-or-id, and stamps are written in one batch.

The core concurrency pieces hold up under scrutiny:

- **Whoosh writer.** The writer re-reads the stored hashes under the lock. `SegmentWriter` reads the TOC after it takes the lock, so the in-place `add_field` upgrade is race-safe.
- **Deletions.** These are handled through `indexed - doc_hashes`.
- **SQLite signature.** It is taken *before* the read, so a publish that lands mid-read only causes a harmless extra re-read later.

The main gap is that the "only the config watcher writes the search index" rule (fix #7) is not enforced everywhere. One existing writer path remains, and the new stale-on-LockError recovery has nothing that actually reschedules it.

## Findings

### P2 1: Search index still has a second writer (`remove_tool_by_id`), and a LockError-skipped build is never rescheduled

`CachedToolBox.remove_tool_by_id` still calls `self.app.reindex_tool_search()` unconditionally (`lib/galaxy/tools/cached_toolbox.py:1730`), from whichever process handles the uninstall. On a non-watcher web worker this makes two writers to the shared `tool_search_index_dir`: the uninstalling process, and the watcher reacting to the broadcast. That contradicts fix #7's stated invariant ("Only the elected config watcher reindexes now").

<details><summary>Details</summary>

- **What changed.** Fix #7 gates only the `reload_tool_source_cache` handler (`queue_worker/__init__.py:418-421`) and drops the install-time reindex in `tool_panel_manager`. The uninstall path keeps its local reindex.
- **Why it matters now.** With incremental builds, each writer computes a delete/update diff from *its own* in-memory index. A non-watcher whose view lags, for example one that hasn't processed a peer install's broadcast yet, can commit last and delete documents for newly installed tools. Nothing then rebuilds until an unrelated event. Before the PR every process clobbered with a full CLEAR, so this is not new in kind. The PR's own comment, "The other writer may hold an older corpus" (`tools/search/__init__.py:220-223`), describes exactly this hazard.
- **The retry is passive.** On `LockError`, `build_index` sets `indexed_reload_count = None` and says "the next `rebuild_toolbox_search_index` retries". Nothing schedules that task, though. It is only sent on toolbox reload, at postfork, and on watcher election (`app/__init__.py:1192,1218`, `queue_worker/__init__.py:282`). A stale index therefore persists until some unrelated reload or install.
- **Related cost.** An uninstall of an N-tool repository still costs N removals, each with its own broadcast and reindex. The PR batched installs but not this sibling path.

</details>

**Suggested fix.** Move the watcher predicate (`_writes_tool_search_index`) into `app.reindex_tool_search()` itself, so every caller obeys it, and drop the call-site gate in `reload_tool_source_cache`. This is safe for removals:

- A non-watcher's broadcast uses `noop_self=True`, which still reaches the watcher.
- On the watcher itself, the local call passes the gate.

Optionally, re-queue `rebuild_toolbox_search_index` after a `LockError` (for example with a short delay) instead of relying on the next unrelated event.

### P3 1: The install pre-index runs for every `get_repository_tools_tups` caller, and is wired by `isinstance`

`installed_repository_metadata_manager.py:91-107` calls `toolbox.index_tool_files(...)` for every tool in `metadata_dict`, unconditionally. The comment says "None of these tools is in a conf yet". That holds for a new install, but the method also serves `update_in_shed_tool_config`, which runs on a metadata reset when metadata changed, plus activate and update. Where tools are already indexed, this adds a populate, a fleet-wide `reload_tool_source_cache` broadcast, and an index reload in every process. The per-tool miss path it replaces cost nothing on an index hit.

<details><summary>Details</summary>

- **Filtering.** Filter `path_guids` against what the index already covers (`CachedToolBox._index_source_paths()`), so the batch keeps the old "only on miss" semantics.
- **Layering.** The shed layer now imports `CachedToolBox` and branches on `isinstance`. Yet the PR's last commit added a no-op `batch_index_writes` to the base `ToolBox` precisely to avoid that pattern in `DataManagers`. Sibling install code now asks "is this the cached toolbox?" three ways:
  - `config.use_cached_toolbox` in `tool_panel_manager`
  - `isinstance` here
  - polymorphic no-op in `DataManagers`
- **Hook.** A base `ToolBox.index_tool_files(path_guids)` no-op would match `batch_index_writes`, with the `CachedToolBox` override doing the filtering.
- **Duplicated computation.** The pre-index loop recomputes the same `(tool_path, relative_path, guid)` → abspath values as the load loop just below it. Computing them once and reusing them for both loops would remove the duplication.

</details>

### P3 2: Comments and log messages now contradict the new behavior

- **`lib/galaxy/tools/source_store/search.py:55-57`.** The comment says a rebuild that can't get the lock "can be skipped: the process holding the lock is writing the same documents". The PR now does the opposite, leaving the index stale because the other writer may hold an older corpus.
- **`lib/galaxy/tools/source_store/search.py:353-355`.** "Every process reindexes after a reload broadcast and writes this directory" is no longer true after fix #7.
- **`lib/galaxy/queue_worker/__init__.py:382`.** "App is not a webapp, not building a search index" now also logs for webapps that simply aren't the config watcher, through the shared `_writes_tool_search_index`.
- **`lib/galaxy/tools/cached_toolbox.py:751-757`.** The `_index_needs_population` docstring says the populator "can't write those stores, so a miss there could never be healed". After fix #9 the populator *does* heal read-only-conf misses into the default store. Behavior is mostly covered anyway, because the `tool_confs` freshness probe hashes every conf, read-only-routed ones included, so a conf change triggers a full populate. The no-probe coverage scan still skips those confs, though. Either update the docstring or include those confs, excluding the store's published paths as the populator now does.

### P3 3: Fix #7's behavior change has no test

No test asserts that `reload_tool_source_cache` reindexes only on the watcher. It is the main behavioral change of fix #7, and the P2 1 fix would naturally sit next to such a test. Integration tests run a single process that is always the watcher, so they cannot catch a regression here. A small unit test with `is_config_watcher` toggled would be enough.

Minor: `test_partial_populate_discovers_only_requested_paths` adds a function-level `from galaxy.tools.source_store import populator` with no comment. It mirrors an existing test in the same file, but the module could be imported at the top.

## Checked and fine

- **Sharing default entries with the version map** (`ToolIndex._share_default_entries_by_version`). `add_entry` already shares these objects in freshly built indexes, and `_stamp_data_manager_id` still handles the non-default twin.
- **Data manager id = guid-or-id.** This matches `DataManager.id`. Data manager tools route to the default store, so a read-only bundle can't shadow the corrected entry. Rolling back is safe: older code keeps any non-empty `data_manager_id`, and the guid is the correct registry key there too.
- **Hash determinism.** Search documents are built from ordered lists only: entry list fields, plus `curated_tool_tags`, which preserves order. The per-document hash is therefore stable across restarts. Only `id` and `doc_hash` are stored fields, so reading every stored hash before a build is cheap.
- **Config watcher election.** It considers only webapp processes, so job handlers never become the watcher.
- **Package layering.** `galaxy.tool_shed` and `galaxy.tools` ship in the same `app` package, and the new top-level import creates no cycle.
- **Store disposal.** Removing the explicit read-only `dispose()` from `CachedToolBox.invalidate_index_cache` loses nothing. `SqlAlchemyToolSourceStore` is the only backend, and it now disposes whenever the signature changes. Non-SQLite read-only URLs return no signature, so they are still always re-read and disposed.

## CI

Three checks failed:

- Package tests on 3.10 and 3.14, from a `tool_shed/webapp/fast_app.py` mypy error (`FastAPI(tags=...)`).
- One Playwright run, from a `test_workflow_run` history timeout.

All three look unrelated to this PR.

## Risks

Mostly a two-way door: the persisted tool index format and schema hash are unchanged, and the hash is now pinned by a test. The Whoosh index upgrades in place and can always be rebuilt. The closest thing to a one-way change is operational: search indexing now depends entirely on the elected config watcher.

<details><summary>Risk Details</summary>

- **Search index writer.** Only the elected config watcher writes it now, and the election spans every host. A multi-host deployment whose `tool_search_index_dir` is host-local, rather than shared, no longer refreshes search on non-watcher hosts after installs. Before the PR it did so incidentally, through every process reindexing on `reload_tool_source_cache`. Deployments that keep the default under a shared `data_dir` are unaffected.
- **Rolling restarts.** Pre-PR code treats an index that has the new `doc_hash` field as schema drift, and `rmtree`s and rebuilds it. Post-PR code adds the field back. If the watcher role flips between old and new processes during a rolling restart, the directory can be rebuilt several times. This is transient.
- **Read-only confs.** Every populate now walks read-only-routed confs and stats tools missing from the published store. If a bundle's stored `source_path` strings don't match the local normalized paths, for example because the bundle was built with a different `tool_path` or mount, every tool in that conf is copied into the default store.
- **Read-only cache invalidation.** Republishing is detected through `(inode, size, mtime_ns)` of the database and its `-wal`. A republish with the same size and mtime at one-second resolution would go unnoticed until the next change.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the single-writer assumption for the search index. That means the `remove_tool_by_id` path (P2 1) and whether any supported multi-host layout keeps `tool_search_index_dir` per host.

On a CVMFS deployment, check the "routing N to writable stores" log line of a full populate. It should show close to zero tools routed from the read-only-routed shed conf beyond actual post-publish installs. That confirms the published paths match the local paths.

Separately, John may want to note that this sizeable performance PR targets `release_26.2` while carrying the 27.0 milestone.

</details>
