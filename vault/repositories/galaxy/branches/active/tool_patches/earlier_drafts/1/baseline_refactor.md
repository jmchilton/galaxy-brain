Run via Claude Opus at high effort.

No refactoring of the base branch was performed.

History unchanged: HEAD stays `4ec188d7a21` (Baseline tests commit `daeb3750f0c` still first). Target unit suites pass at HEAD (563 passed, 2 xpassed).

## Candidates considered

- **Refactor-titled commits** (`415c7d4c5e9`, `e2ee152c425`, `8abbd9d5351`, `4ec188d7a21`). They only restructure code this branch adds: the new `patches` package and its own seam helpers. Nothing in them could land on dev ahead of the feature.
- **`reload_tool_by_id` passing `guid` / `tool_shed_repository` to `load_tool`** (`lib/galaxy/tool_util/toolbox/base.py`, from `74b4129e886`). This is not behaviour-neutral on dev.
  - On dev, a reloaded shed tool skips `populate_tool_shed_info`. It loses `changeset_revision`, `sharable_url` and `_conf_tool_shed_repository`. The post-reload block copies `tool_shed` / owner / name / `installed_changeset_revision` back, but not those.
  - Shed-aware parse steps such as help-image rewriting also run without the repository.
  - `load_tool`'s `add_tool_to_cache` condition (`tool.tool_shed_repository or not guid`) depends on `guid`.

  That makes it a small standalone fix, not a refactor. The baseline test `test_reload_tool_by_id_keeps_shed_identity` pins only id/guid/old_id/tool_shed/owner/name/installed_changeset_revision. It passes at the baseline commit (see `test_challenges_debrief.md`) and at HEAD, so it doesn't distinguish the two. A dev-first fix PR would need a red test that asserts `changeset_revision` / `sharable_url` survive a reload. The feature needs the change only so the reloaded tool is keyed for patching, so it stays in the feature commit. It could be split out as its own dev fix if a reviewer asks.
- **`lib/galaxy/tool_util/unittest_utils/tool_patches.py`**. Writes patch-collection YAML. It has no use without the patches package, so it can't land on its own.
- **Populator helpers `search_jobs` / `run_tool_request(use_cached_jobs=)`** (`lib/galaxy_test/base/populators.py`). The only consumer is the new integration test. `lib/galaxy_test/api/test_jobs.py` has its own `_search*` helpers with a different payload shape (JSON-string inputs plus a retry loop). Moving those onto the populator would be API-test churn that this branch doesn't need, and with no dev consumer the helpers would just be unused infrastructure.
- **Seam extractions** (`ToolBox.get_expanded_tool_source`, populator `process_tool`, `CachedToolBox` stored-source path, the eager reload path). Each integration point is a one-line wrap (`apply_tool_patches(...)`) or one extra guard (`indexed_patch_is_current`, `patch_blocks_job_cache`). Hoisting none of them would shrink the feature diff in a way that justifies a dev-first commit.
- **Shed install-layout test fixtures** (`SHED_TOOL_TEMPLATE`, `_patch_shed_v1` in `test/unit/app/tools/test_toolbox.py`). They are inline and used only by the new patch tests. The existing `_setup_two_versions*` helpers already cover the baseline shed-reload test. Nothing to factor out ahead of the feature.
