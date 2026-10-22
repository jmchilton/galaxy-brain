# Consolidate cached toolbox version views and in-memory reconciliation

Context: galaxy#24279 (26.2) fixed configured-vs-storage-only version selection and in-place edit re-indexing in `CachedToolBox`. The fix was kept minimal for the release branch, with a docstring note on which `ToolIndex` view lookups should use. This issue tracks the structural cleanup for `dev`.

## Plan

1. **One offered-versions API on `ToolIndex`.** Make the configured view the default (`get`, `versions`). Rename raw access to something explicit (e.g. `stored_versions` / `get_stored`) and use it only in store/populator code, path lookup and reload reconciliation. Audit every `entries_by_version` read in `lib/galaxy/tools/cached_toolbox.py` and migrate it.
2. **Index-diff reconciliation.** Replace the ad hoc reload reconciliation with a single `IndexDiff(previous, current)` that yields the added, changed and removed (id, version) pairs. The current pieces to replace are the removed-version loop, `_remove_versions_in_memory`, `_refresh_changed_entry` and the removed-id pop. One toolbox method then applies the diff to registry slots, proxies, the LRU cache and lineages. `IndexDiff` can be unit-tested without a toolbox.
3. **File staleness.** Detect edits made only in imported macro files. `edited_tool_files` currently compares only the tool file's hash. The eager `ToolCache` tracks macro paths, and the index entry could record them too. If both paths end up with the same model, share the check. Also consider recording a fresh mtime when content is unchanged, so a touched-but-identical file isn't re-hashed on every reload.
4. **Begin splitting `cached_toolbox.py`** (~2000 lines) into index-backed lookup/resolution, reload reconciliation, and materialization.

## Tests

The existing `test/unit/app/tools/test_cached_tool.py` and `source_store/test_index_versions.py` tests should pass unchanged. Add `IndexDiff` unit tests red-to-green. `TestCachedToolBoxKeepsConfiguredVersion` and `TestCachedToolBoxReloadAfterLocalEdit` cover the end-to-end behavior.
