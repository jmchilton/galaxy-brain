# Follow-up: consolidate cached toolbox version views and in-memory reconciliation

Context: galaxy#24279 (26.2) fixed configured-vs-storage-only version selection and in-place edit re-indexing in `CachedToolBox`. The fix was kept minimal; this tracks the structural cleanup for `dev`.

## Plan

1. **One offered-versions API on `ToolIndex`.** Make the configured view the default (`get`, `versions`), and rename raw access to something explicit (e.g. `stored_versions`/`get_stored`) used only by store/populator code and path lookup. Audit every `entries_by_version` read in `lib/galaxy/tools/cached_toolbox.py` and migrate.
2. **Index-diff reconciliation.** Replace the ad hoc reload reconciliation (removed-version loop, `_remove_versions_in_memory`, `_refresh_changed_entry`, removed-id pop) with a single `IndexDiff(previous, current)` -> added/changed/removed (id, version) that one toolbox method applies to registry slots, proxies, LRU cache and lineage. Unit-testable without a toolbox.
3. **Shared file staleness helper.** Extract mtime+md5 "changed since indexed" check used by `galaxy.tools.cache.ToolCache` and `CachedToolBox._reindex_edited_tool_files`; consider covering macro imports (currently undetected).
4. **`remove_entry`/`remove_version` unification** with a `keep_placements` flag on the single removal path.
5. Begin splitting `cached_toolbox.py` (~2000 lines): index-backed lookup/resolution vs. reload reconciliation vs. materialization.

## Tests

Existing `test/unit/app/tools/test_cached_tool.py` and `source_store/test_index_versions.py` should pass unchanged; add `IndexDiff` unit tests red-to-green.
