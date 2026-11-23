# galaxy#24800 performance challenge debrief

Reviewed commit: `21620b47273fc9f76ccf632debccbe02c8badf2e` (base `release_26.2`).
Question: what does clearing the `/api/tools` listing caches on every `CachedToolBox.invalidate_index_cache()` cost?

## What the change does

At the end of `CachedToolBox.invalidate_index_cache()` (`lib/galaxy/tools/cached_toolbox.py:1709`), the PR now calls `self._invalidate_tool_caches()` with no tool id. That empties `_tool_to_dict_cache` and `_tool_to_dict_cache_admin`, and drops the lazily built curated-tag and EDAM id sets (`lib/galaxy/tool_util/toolbox/base.py:1491`). The next `/api/tools?in_panel=...` / `/api/tool_panels/{view}` request in each process rebuilds the payloads, once for the non-admin cache and once for the admin cache.

## How often it fires

`invalidate_index_cache()` runs on every `reload_tool_source_cache` control task (`lib/galaxy/queue_worker/__init__.py:405`), in every web and handler process. The task is broadcast after populates (including each batch from `populate_store.py --watch`), shed installs, and tool removals. It also runs directly from `tool_panel_manager.py:219`. These are admin-driven or ops-driven events, not request-driven ones. There is no polling path that triggers a reload.

## Rebuild cost (measured)

Per-entry rebuild uses `CachedTool.to_panel_entry`, which builds a dict from `ToolIndexEntry` fields. It never materializes or parses a tool. I measured it with a throwaway script that uses the unit-test `_registry_box` fixture: N `CachedTool` stubs, a real `galaxy_url_prefix`, and a `SimpleNamespace` trans. The script is `bench_24800.py` in the coordinator's scratchpad and is not committed.

| tools | cold payload build (one cache) | hot cache walk | `invalidate_index_cache()` itself | rebuild after reload |
|---|---|---|---|---|
| 1,000 | 6.4 ms | 0.3 ms | 3.5 ms | 5.9 ms |
| 10,000 | 82 ms | 4.0 ms | 47 ms | 85 ms |

That works out to about 6–9 µs per tool for each cache. For a 10k-tool server, the added cost is about 85 ms for the first non-admin listing request after a reload, about the same for the first admin request, and nothing after that. This is a micro-benchmark, not an end-to-end server timing. It leaves out the panel walk and response serialization, which the request pays whether the cache is warm or not.

Note: with the unit-test default `MagicMock` config, `tool_runner_link` gets a mock `url_prefix` and costs about 145 µs per call. That is a fixture artifact and not representative.

## Context: other work done on each reload

The same control task also calls `app.reindex_tool_search()` right after `invalidate_index_cache()`. That fully rebuilds the Whoosh index for every panel view (`lib/galaxy/tools/search/__init__.py:202`). `invalidate_index_cache()` itself already does O(N) work on every reload: it snapshots hashes, calls `replace_entry` on every stub (each reloaded entry is a new object), and diffs versions and removals. Measured, that is 47 ms at 10k tools. A lazy ~85 ms rebuild per cache is small next to that work and is not on the reload path itself.

## Considered and rejected

- **Targeted per-id invalidation** (`_invalidate_tool_caches(tool_id)` only for changed ids): the reload replaces every entry object, so knowing which ids changed would mean comparing pydantic entries field by field. That is O(N) work about as expensive as the rebuild it would save. Not worth it.
- **Skipping the clear when the index object didn't change**: a read-only SQLite store whose file hasn't changed returns the same cached `ToolIndex` (`sqlalchemy.py:499`), so a `loaded is previous_index` guard could skip the clear. But a composite store always merges into a new `ToolIndex`, and the search reindex runs unconditionally anyway. The saving is at most one ~85 ms rebuild per process per no-op reload. I did not raise this as a finding.
- **Thundering herd**: `get_tool_to_dict` takes no lock, so concurrent first requests after a reload may each rebuild entries. The writes are idempotent dict stores, and the worst case is k × ~85 ms of CPU across threads, once per reload. Negligible.
- **Memory**: the caches hold the same payloads as before. Clearing them only frees memory until the next request.

## Adjacent observation (not performance; for the bug reviewer)

`CachedToolBox.index_tool_files()` (`cached_toolbox.py:1398`) and `_reload_tool_index()` (`cached_toolbox.py:963`) also swap `_tool_index` and do not clear the listing caches. They are outside this PR's diff. I don't know if they can leave stale payloads, because the stubs' `replace_entry` is not called on those paths.

## Measurement plan if anyone wants end-to-end numbers

1. Boot a cached-toolbox Galaxy against a large tool conf (for example a usegalaxy.org-scale `shed_tool_conf` populated into SQLite) on a free port.
2. Time `GET /api/tools?in_panel=true` warm, then send `reload_tool_source_cache` (or touch a watched tool) and time the first request after it, as admin and as non-admin.
3. Compare the result with a timing of `app.reindex_tool_search()` taken on the same reload. I expect the difference in the listing request to be under 100 ms at 10k tools.

## Recommendations

None. The invalidation is cheap, lazy, and limited to rare admin or ops events.
