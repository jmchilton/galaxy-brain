Run via Claude Opus at high effort.

# Test challenges debrief (re-harden after re-scope)

This is a fresh run. `earlier_drafts/1/test_challenges_debrief.md` is history only; every check below was redone.

## What I did

Two commits on `tool_patches`, on top of `7baa6c55d67`:

- `fd76c0e0987` **Challenge tool patch tests: real store row, raw source API, level names.**
  - **`test_tool_patches_parse_from_disk_instead_of_unpatched_store_rows` (`test_toolbox.py`)**
    - Before: the test used a `MagicMock` store plus `get_by_source_path.assert_not_called()`, which only tests the implementation.
    - Now it seeds a real sqlite `SqlAlchemyToolSourceStore` with an unpatched row for the tool's path. The row is marked by the name "Stored Row".
    - It checks that the row is served when no patches are configured, so the test can't pass vacuously.
    - With patches configured, it checks that the served source is the patched file: name "Test Tool", `echo -- "$param1"`, state `applied`.
  - **Integration (`test/integration/test_tool_patches.py`)**
    - Renamed `test_special_inputs_patch_*` to `test_unusual_inputs_patch_*` (three tests), to follow the level rename. No other `special_inputs` or `all_inputs` remain in the branch diff.
    - `TestToolPatchAlreadyApplied` used to reach into `self._app.toolbox.get_tool(...).tool_source`. It now reads `GET /api/tools/{id}/raw_tool_source` (admin), which returns `tool.tool_source.to_string()`.
    - Added a `_raw_tool_source()` helper, now used twice.
    - **Strengthened:** `test_api_reports_patch` also asserts that the served source holds the patched `#set $clean_identifier`. It runs for both the eager and the cached toolbox.
  - **mypy, run from `lib/` the way `make mypy` runs it**
    - Integration test: 17 `union-attr` errors. Fixed with a `dataset_populator: DatasetPopulator` class annotation (same pattern as `test_requested_uuids.py`); the `_app` line went with the rewrite.
    - `test_tool_patches.py:1289`: `"".join(itertext())` is typed `str | bytes`. Fixed with `etree.tostring(..., method="text", encoding="unicode")`.
    - The perf debrief's note ("one existing error … at `patch_state.states`") was wrong on both location and count. There is no such error now.
    - Only the error that already exists on dev, in `managers/notification.py`, remains.
- `1fffa4251fe` **Dropped `test_materialised_tool_carries_entry_patch` (`test_cached_tool.py`).** It only tested what the integration tests already cover.
  - To check, I reverted `tool_source.patch_state = entry.patch …` in `cached_toolbox.py`.
  - Four `TestToolPatchAppliedCachedToolbox` tests then failed at their own assertions: `KeyError: 'patches'` in `test_api_reports_patch`, `copied_from_job_id` set where `None` was expected in both job-cache tests, and the search returned the job.

## Kept, and why

- **`test_to_panel_entry_reports_patches_without_materialise`.** `/api/tools/{id}` materialises the tool, so no integration test reaches the stub panel entry. Removing the `payload["patches"]` line in `CachedTool.to_panel_entry` makes it fail (`KeyError: 'patches'`).
- **`test_ops_outside_inputs_skip_the_parameter_model`.** It counts `_parameter_model` calls through a monkeypatch. It is a perf guard of the kind the perf process allows (like a query count), and the result can't be observed any other way. Its second half (an op under `<inputs>` still builds both models) overlaps `test_parameter_model_change_is_mismatch`, which is fine.
- **`test_concurrent_apply_parses_each_file_once`** monkeypatches `parse_patch_yaml` as a spy. It is the narrowest seam for "parsed once under concurrency".
- **`test_tool_patch_applies_to_keyed_version_only` and `test_reload_tool_by_id_keeps_tool_patch`.** The shed-guid key, version selectivity and reload aren't covered at the integration layer: the fixture is a `_local` tool.
- **Engine tests calling `evaluate_unit`.** The engine is the unit under test, with a small API.
- **Lint tables.** Two cases (`security_builder`, `compat_builder`) check that the base builders are valid. Every rejection case is derived from those builders, so without them a case could pass for the wrong reason.
- **`TestToolPatches` restart modelling (`test_populate_store.py`).** It's sound: it asserts that the same config keeps its database before a fresh config picks up the change.
- **Small edits** to `test_freshness.py` (stub attribute), `test_build_index_entry.py` (stub attribute) and `test_index_versions.py` (hash pin). They are required by the schema and config changes, not new tests.
- **`search_jobs` and `tool_request_raw(use_cached_jobs=)` populator helpers.** Already in place. I didn't move `test_jobs.py`'s private `_search*` helpers onto `search_jobs`; that's outside this branch's scope.
- **No E2E, Selenium or Vitest tests.** The branch has no client diff, and the badge and admin UI are out of scope.
- **Not separately tested:** `_log_read_only_tool_patches` and the populator and boot summary log lines, plus the `--tool-patch-path` CLI flag, which is a one-line pass-through to `tool_patch_paths`. Not worth dedicated tests.

## Red and green checks (fresh)

**Baseline `daeb3750f0c`.** I ran it in a temp detached worktree. Its parent is merge-base `ce63095e7a8`.
- `test_reload_tool_by_id_keeps_shed_identity` and `test_changed_tool_reparsed_while_unchanged_carried_forward` both passed.
- To confirm the old `lib` was the one imported, I copied the branch's unit file there and imported it: `ModuleNotFoundError: galaxy.tool_util.patches`.

**Re-scope and perf tests.** For each, I reverted the lib code in the worktree, ran the test, then restored with `git checkout`:

| Reverted | Test that fails | Failure |
| --- | --- | --- |
| `ENGINE_VERSION` fold in `token()` | `test_engine_version_is_in_the_digests` | `all(...)` False |
| `counts.subtract(since)` in `summary()` | `test_summary_counts_applied_states` | `applied 3 …` instead of `applied 1 …` |
| `7baa6c55d67` engine hunk (`git apply -R`) | `test_ops_outside_inputs_skip_the_parameter_model` | 2 model builds instead of `[]` |
| Per-config memo in `tool_patch_database_from_config` | `test_changed_patch_file_repatches_unchanged_tool` and `test_freshness_token_follows_collections_and_policy` | `2 == 3`, and the token changed without a restart |
| `if self.app.tool_patches is None` store-skip guard | rewritten store-row test | `'Stored Row' == 'Test Tool'` |
| `entry.patch` hand-off in `_create_tool_from_stored_source` | four cached-toolbox integration tests | listed above (unit duplicate dropped) |
| `payload["patches"]` in `CachedTool.to_panel_entry` | `test_to_panel_entry_reports_patches_without_materialise` | `KeyError: 'patches'` |

**Pure package.** `galaxy.tool_util.patches` doesn't exist without the branch, so its tests can only fail with `ImportError`. N/A.

## Test results

- **Unit:** `test/unit/tool_util/test_tool_patches.py`, `test/unit/app/tools`, `test/unit/scripts/tool_source` and `test/unit/tool_util/toolbox` gave 1408 passed, 1 skipped, 2 xpassed. The one failure is `test_watcher.py::test_watcher`, which also fails on a clean `origin/dev` worktree (re-checked this run; environmental). After the drop, `test_cached_tool.py` alone gave 102 passed.
- **Integration, run alone:** 12 passed in 109s. One more targeted run of the cached class (5 tests) was the red check above.
- **Lint and types:** ruff, black, isort and pre-commit are clean. mypy from `lib/` is clean on the touched test files apart from the existing `notification.py` error.

## Status

READY. No blockers.
