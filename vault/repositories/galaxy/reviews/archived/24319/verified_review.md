### P3 1: A leftover entry at the same path reloads the index on every call (implementation verified)

`_index_lags_store` reports lag when **any** in-memory entry for a path has a hash other than the store's row. A partial populate only adds entries and never drops other ids at the same path. So when a tool file is rewritten in place with a new version, the old version's entry stays in the persisted index with the old hash. The first `index_tool_files` call catches up correctly. After that, every install, metadata reset or index miss for that path pays a full `load_index()` plus `_rebuild_shed_short_id_map()`, because the reload never removes the leftover entry. The cost is performance only. The leftover entry already couldn't be materialized before this PR.

<details><summary>Evidence</summary>

The test uses the PR's `_indexed_shed_tool_box`. It indexes `.../updated/1.0` at path P, rewrites P as version `2.0`, runs a peer populate with guid `.../updated/2.0`, then calls `index_tool_files({P: ".../updated/2.0"})` twice. The first call picks up the `2.0` entry. The second call swaps `box._tool_index` again, and the reloaded index still holds the `1.0` entry with the old hash.

</details>

Treat a path as lagging only when it has in-memory entries and none of them holds the store's hash. This keeps the PR's `source_path` matching and its no-reload cases (`version="1.0"`, `version=""`, no version). The first call still catches up. Every later call keeps the index.

<details><summary>Details</summary>

Fixed in `f29b7c86069` on `pr_24319_review_0`. The fix collects the hashes held per path and checks `stored_hashes[path] not in held`. The new test is `test_index_tool_files_reloads_once_after_an_in_place_version_bump`. Scoping the check to the guid's own entries would also remove the false positive. It would miss the version-bump case on the first call, though, because the new guid has no in-memory entry yet, so the toolbox would never catch up.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: The all-entries `ToolIndex` walk is hand-rolled again (implementation verified)

The new `itertools.chain(index.entries.values(), *(v.values() for v in index.entries_by_version.values()))` is the third copy in `cached_toolbox.py` of the walk over every index entry. The other two are `_index_source_paths` and the dangling-hash check in index reconciliation. `ToolIndex` shares the default entry object between both maps, so each copy visits most entries twice. A `ToolIndex` method would replace all three and remove the new `itertools`/`Iterable` imports.

Add `ToolIndex.iter_entries()`. It yields every `entries_by_version` entry, then any `entries` default not already seen, which covers indexes serialized before `entries_by_version` existed. Use it at the three `cached_toolbox.py` sites.

<details><summary>Details</summary>

Fixed in `659124e5ba4`, with one `test_index_versions.py` test for deduplication and legacy indexes. The loop at `populator.py` ~792 walks only `entries_by_version` on purpose, so it was left alone.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: `_populate_config` test helper duplicates the one in `test_populate_store.py` (implementation verified)

The new `_populate_config(tmp_path, conf)` in `test/unit/app/tools/test_cached_tool.py` copies `_populate_config` in `test/unit/scripts/tool_source/test_populate_store.py` field for field, just as a `SimpleNamespace` instead of a class. The next config attribute the populator reads will have to be added to both, or one of the fakes breaks.

Move one class-form helper into `galaxy.app_unittest_utils` and import it from both test files.

<details><summary>Details</summary>

Fixed in `bf10dda0490` as `galaxy.app_unittest_utils.tool_source_support.PopulateConfig`. `tool_source_stores` is now set per instance, because a module-level class would share a mutable class attribute between tests. Both test files pass with it.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Tests stop one step short of the reported symptom (implementation verified)

The real-store test asserts on `index_tool_files` directly. The reported failure was `ToolMaterializationError` from `_load_tool_on_demand`, which recovers only through its self-heal (`_populate_adhoc_path` -> `index_tool_files` -> `_resolve_index_entry`). The tests don't pin that user-visible path.

Add a test that materializes the stale entry right after the peer populate and asserts that it gets the new source.

<details><summary>Details</summary>

Added in `a9a4caa5db0` as `test_materializing_a_stale_entry_after_a_peer_populate_heals`. It stubs `_create_tool_from_stored_source` to return the stored row. With `cached_toolbox.py` reverted to `cffdae9b5f2~1`, it fails with the reported `indexed source is missing (path=..., hash=...)`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
