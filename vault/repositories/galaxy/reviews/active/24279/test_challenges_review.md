# Test Challenges Review — PR #24279

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Opus 5.5, effort: low
- Reviewed commit: `890d6f7ab98`
- Detailed plan: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall: coverage is good for a release fix. All three bugs have unit coverage; bug 2 (edit + reload) also has an integration test. The 4 new `test_cached_tool.py` tests pass locally. Findings are about the right layer and mock hygiene, not missing coverage of the core logic.

### P2 1: Bug 1 (configured version shadowed) has no integration test

The issue reported (#24263) is user-visible through the API: a conf naming jupyter 0.3 served 1.0.3. Coverage is unit-only (`ToolIndex` ordering, composite merge, `_registry_box` with hand-registered entries). A `TestCachedToolBox*` integration case in `test/integration/test_tool_source_storage.py` could reuse the `TestCachedToolBoxReloadAfterLocalEdit` pattern: one conf names `probe.xml` at 1.0, and the same tool dir holds an unconfigured `probe_new.xml` at 2.0 that gets indexed storage-only. Then assert `GET /api/tools/probe` returns `version == "1.0"` and `versions == ["1.0"]`. This would cover the whole populate → index → toolbox path the unit tests stub out. If the integration test lands, `test_unconfigured_bundled_version_does_not_replace_configured_tool` could shrink to its exact-lookup and materialize edge cases.

### P3 1: `test_reindex_edited_tool_files_reindexes_only_changed_files` imports inside the test

`from galaxy.util.hash_util import md5_hash_file` is inside the function. Move it to the module top.

### P3 2: Parametrized read-only store uses `MagicMock(read_only=True, **{"load_index.return_value": None})`

In `test_toolbox_refuses_to_build_without_read_only_store_index`, a tiny dataclass or noop store (`read_only = True`, `load_index() -> None`) would read more clearly than a MagicMock with a dotted kwargs dict. So would a real read-only `SqlAlchemyToolSourceStore` with no published index, if one is cheap to build. The real store would also prove that the "no loadable index" detection works against an actual store.

### P3 3: Reindex unit test monkeypatches `index_tool_files`

The test's job is the selection logic: mtime gate, hash compare, and the shed-guid vs None mapping. It would be cleaner as a free function, e.g. `edited_tool_files(stores) -> dict[path, guid|None]`, that the method calls and the test exercises directly, with no `_seam_box` or monkeypatch. The shed-guid branch (`entry.id if is_shed_guid(...)`) is currently untested. Cover it in the refactored test.
