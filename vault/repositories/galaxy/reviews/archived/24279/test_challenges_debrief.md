# Test Challenges Debrief — PR #24279

Profile gx_test_challenger, Opus 5.5, low effort, commit `890d6f7ab98`. Review only; no PR edits.

## Per-test challenge

- `test_index_versions.py` (9 new): pure `ToolIndex` behavior (default selection, load repair, `remove_version`, supersede, placement order). Real objects, no mocks. Keep. Release-fix scope keeps the overlap small.
- `test_composite_store.py` (2 new): real sqlite stores, merge preference. Keep. The `CachedToolBox.__new__` hack test was correctly reduced to the store property and moved to `test_cached_tool.py`. That is an improvement.
- `test_cached_tool.py::test_unconfigured_bundled_version_does_not_replace_configured_tool`: uses `_registry_box` and a lambda stub for `_load_tool_on_demand`. Reasonable at unit level, but the headline scenario belongs in integration (P2 1).
- `test_cached_tool.py::test_invalidate_index_cache_drops_versions_a_reindex_removed`: peer-process path. Hard to reach from integration (single process), so keep as a unit test.
- `test_cached_tool.py::test_reindex_edited_tool_files_reindexes_only_changed_files`: monkeypatches `index_tool_files` and imports inside the function. Recommend extracting the selection into a helper function and testing it directly, including the shed-guid branch (P3 1, P3 3). Overlaps with the integration edit test only for the happy path; the mtime-gate case is unit-only, so keep it.
- `test_cached_tool.py::test_toolbox_refuses_to_build_without_read_only_store_index`: MagicMock stores. Swap for a noop/dataclass or a real read-only store (P3 2). Boot failure is awkward to test in integration, so the unit level is right.
- `test_populate_store.py` (2 new): real populate against temp confs. Good. The `_Cfg.get`/`datatypes_config` additions are minimal fixture support.
- `test_stores.py`: rename only, matches the new behavior.

## API/Integration

- `TestCachedToolBoxReloadAfterLocalEdit`: good red-to-green shape. It uses existing `self._get` and `reload_toolbox`; only one URL is repeated, and it's fine. Not run (no integration runs per instructions).
- `TestCompositeToolSourceStorage` setup now publishes an empty index. This is a needed adaptation to the new refusal, not a weakening.
- Gap: no integration test for bug 1 (P2 1).

## E2E

None needed: this is backend/admin toolbox behavior, and the API covers it.

## Ran

`pytest test/unit/app/tools/test_cached_tool.py -k "unconfigured_bundled or invalidate_index_cache_drops or reindex_edited or refuses_to_build"`: 5 passed. Red-without-fix not checked (low effort).
