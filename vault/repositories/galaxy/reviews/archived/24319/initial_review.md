# Initial review: galaxyproject/galaxy#24319

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, medium effort
- Reviewed commit: `cffdae9b5f2` (base `release_26.2`, merge base `f04737befdf`)

## Verdict

Small, well-targeted fix. Diagnosis in the PR body checks out against the code: `_load_tool_on_demand` -> `_populate_adhoc_path` -> `index_tool_files` is the self-heal path that hit the 500. Before this change a populate that wrote nothing left the stale entry in place, so `_stored_source_for_entry` rejected the row again. With the change, the heal reloads the index and `_resolve_index_entry` returns the current entry. Matching on `source_path` (not `(id, version)`) is consistent with `_stored_source_for_entry`, and the no-reload parametrization covers the version-defaulting cases the PR body describes. The 7 `index_tool_files` tests pass locally. No P1s. A few P3s follow; one is a narrow perf edge that contradicts a claim in the PR body.

## Findings

### P3 1: Leftover same-path entry for another tool id makes every later call reload the index

`_index_lags_store` scans **every** entry in the in-memory index whose `source_path` is one of the paths. A partial populate only `add_entry`s (populator.py ~967-979) and never drops other ids that share a path. So if the tool id or version in a file changes in place, the old guid's entry stays in the persisted index with the old hash. `_index_lags_store` then returns True on every later `index_tool_files` call for that path. The reload doesn't remove the stale entry, so each install, metadata reset or index miss for that path pays a full `load_index()` plus `_rebuild_shed_short_id_map()`. That contradicts the PR body's statement that an index matching the store isn't reloaded.

<details><summary>Evidence</summary>

I wrote a scratch probe on top of the PR's `_indexed_shed_tool_box` helper: index `.../updated/1.0` at path P, rewrite P as version `2.0`, run a peer populate with guid `.../updated/2.0`, then call `index_tool_files({P: ".../updated/2.0"})` twice. The second call still swaps `box._tool_index` (identity assertion fails), and the reloaded index still holds the `1.0` entry with the old hash.

</details>

This is narrow. Shed updates in place normally keep tool versions, and new versions get a new changeset dir. The cost is perf only, because the leftover entry was already unmaterializable before this PR. A cheap way to scope it: when a guid is known, check only `index.entries_by_version.get(guid)` (all versions, filtered by `source_path`), and fall back to the full scan only for `guid is None`. That drops the stale-sibling false positive. It also removes the O(whole-index) scan on every per-tool index miss: the scan is negligible next to the populate, but it runs on every call.

### P3 2: The "all entries in a ToolIndex" walk is now hand-rolled in 4+ places

The `itertools.chain(index.entries.values(), *(v.values() for v in index.entries_by_version.values()))` walk duplicates loops in `_index_source_paths` (cached_toolbox.py ~1329-1334), the dangling-hash check (~830-832) and populator.py ~792. A `ToolIndex.iter_entries()` (or `all_entries()`) in `source_store/index.py` would replace them all and remove the new `itertools`/`Iterable` imports. `entries` objects are usually shared into `entries_by_version` (see `_share_default_entries_by_version`), so most entries are visited twice. That's harmless, and a helper could deduplicate by identity. Optional; if P3 1 is fixed by scoping to the guid, the new site disappears anyway.

### P3 3: `_populate_config` test helper is a verbatim copy

The new `_populate_config(tmp_path, conf)` in `test/unit/app/tools/test_cached_tool.py` copies the helper of the same name in `test/unit/scripts/tool_source/test_populate_store.py:317` field for field, just as a `SimpleNamespace` instead of a class. Two hand-maintained fake configs will drift the next time populate reads a new config attribute. Move it to a shared test utility (e.g. alongside other `galaxy.app_unittest_utils` helpers) and import it in both places. Alternatively, build a real `GalaxyAppConfiguration` as `TestToolsMissingFromReadOnlyStore._config` already does in that file.

### P3 4 (nit): Tests stop one step short of the reported symptom

The real-store test asserts on `index_tool_files` directly. The reported failure was `ToolMaterializationError` from `_load_tool_on_demand`, which recovers only because its self-heal calls `index_tool_files` and then `_resolve_index_entry`. The sqlite fixture is already in place, so one more assertion would pin the user-visible behavior, not just the internal seam: materialize the stale entry (or `_load_tool_on_demand(stale, ...)`) and check that it returns a tool with the new hash and doesn't raise. Optional.

## Not findings

- Imports are at module top in both files.
- Reloading inside `index_tool_files` doesn't purge `_tool_object_cache` / `_tools_by_id`. This was already the case for the `indexes_written` path, and the LRU key includes `source_hash`, so it is not a regression.
- Composite stores: `get_by_source_path` and `load_index` both let earlier members win, so the comparison is consistent across members.
