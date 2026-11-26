Run via Claude Opus at high effort.

No refactoring of the base branch was performed.

History unchanged: HEAD stays `a08b4a59a7b` (Baseline tests commit `daeb3750f0c` still first). Target unit suites pass at HEAD (571 passed, 2 xpassed): `test/unit/tool_util/test_tool_patches.py`, `test/unit/app/tools/{test_toolbox,test_cached_tool,test_tool_source_store_selection}.py`, `test/unit/app/tools/source_store/`, `test/unit/scripts/tool_source/`.

## Commits since `4ec188d7a21`

Re-checked each one for anything that could land on dev ahead of the feature:

- `f2c0bd3526a` (one database per process, summary). Adds `app.tool_patches`, the startup/populate summary log, and the "skip stored rows when patches are configured" guard. All of it reads patch state, so none of it has meaning on dev.
- `bff6bdec4df`, `76b348f58bc`, `cc4712bc072`. Config docs/schema for the new `tool_patch_*` options, the level rename, and the engine-version token. They only touch options and code this branch adds.
- `7baa6c55d67`. An engine-only shortcut inside `galaxy.tool_util.patches`.
- `fd76c0e0987`, `1fffa4251fe`. Tests for the feature only.
- `a08b4a59a7b` (tidy seams). Moves the tool-patches guard into `ToolBox._get_tool_source_from_store` next to its peer guards, types the `_databases` memo, and reads `_model_source` through `XmlPagesSource`. The one change to a dev file, `test_tool_source_store_selection.py`, only adds `tool_patches=None` to the app stub because of the new guard.

## Earlier candidates, re-checked at HEAD

- **`reload_tool_by_id` passing `guid` / `tool_shed_repository` to `load_tool`** (`lib/galaxy/tool_util/toolbox/base.py`). Unchanged since the earlier run, and still a behaviour change on dev rather than a refactor. A reloaded shed tool would keep `changeset_revision` / `sharable_url` / `_conf_tool_shed_repository`, and `add_tool_to_cache` is keyed on `guid`. The baseline test `test_reload_tool_by_id_keeps_shed_identity` doesn't tell the two states apart. The change stays in the feature. It can be split out as its own dev fix, with a red test on `changeset_revision`, if a reviewer asks.
- **Populator helpers `search_jobs` / `run_tool_request(use_cached_jobs=)`** (`lib/galaxy_test/base/populators.py`). The new integration test is still the only consumer. `lib/galaxy_test/api/test_jobs.py` keeps its own `_search*` helpers, which use a different payload shape.
- **Seam hooks**:
  - the `apply_tool_patches` wraps in `ToolBox.get_expanded_tool_source` and the populator `process_tool`
  - `indexed_patch_is_current`
  - `patch_blocks_job_cache` in `Tool`, `jobs.py` and `services/jobs.py`
  - the `CachedToolBox` patch-state plumbing
  - the `ToolIndexEntry.patch` / `ToolIndex.tool_patch_collections` / manifest fields
  - the freshness-token fold-in

  Each is a one-line wrap, a guard or a new optional field. Hoisting any of them ahead of the feature would be dead code on dev.
- **`lib/galaxy/tool_util/unittest_utils/tool_patches.py`** and the shed-layout fixtures in `test/unit/app/tools/test_toolbox.py`. These exist only for the patch tests.
