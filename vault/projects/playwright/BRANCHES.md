# Branches and PRs

Convenience view. **Source of truth is [`vault/agents/mine/MY_BRANCHES.md`](../../agents/mine/MY_BRANCHES.md)** —
a separate branch-management agent owns it, tracks CI, opens PRs, and undrafts.
Update that file first; this one mirrors it.

## PRs

| PR | Branch | Head | State |
|---|---|---|---|
| [#23566](https://github.com/galaxyproject/galaxy/pull/23566) | `playwright_rendering_rules_workflow_1` | `4287ccb92a9` | **merged** 2026-09-17 |
| [#23567](https://github.com/galaxyproject/galaxy/pull/23567) | `playwright_column_definition_send_enter` | `2675c865001` | **merged** 2026-09-17 |
| [#23568](https://github.com/galaxyproject/galaxy/pull/23568) | `test_tool_conf_randomlines_symlink` | `18f5bfb276c` | **merged** 2026-09-17 |
| [#23574](https://github.com/galaxyproject/galaxy/pull/23574) | `playwright_neutral_key_press` | `29018d7cd8a` | **merged** 2026-09-21 |
| [#23589](https://github.com/galaxyproject/galaxy/pull/23589) | `playwright_gesture_vocabulary_port` | `be218a455e3` | **merged** 2026-09-18 |
| [#23592](https://github.com/galaxyproject/galaxy/pull/23592) | `playwright_unlock_invocation_grid_sample_sheet` | `f2edee8c72e` | **merged** 2026-09-20 |
| [#23598](https://github.com/galaxyproject/galaxy/pull/23598) | `playwright_unlock_histories_list` | `0ba200bd303` | **merged** 2026-09-21 |
| [#23601](https://github.com/galaxyproject/galaxy/pull/23601) | `playwright_unlock_tool_form` | `0739e737fe7` | **merged** 2026-09-21 |
| [#23602](https://github.com/galaxyproject/galaxy/pull/23602) | `playwright_unlock_uploads` | `4d2fc929406` | **merged** 2026-09-21 |
| [#23603](https://github.com/galaxyproject/galaxy/pull/23603) | `playwright_unlock_workflow_management` | `66aa76fc613` | **merged** 2026-09-21 |
| [#23607](https://github.com/galaxyproject/galaxy/pull/23607) | `playwright_unlock_workflow_run` | `7da479e62f4` | **merged** 2026-09-21 |

## Pushed, no PR

| Branch | Head | Notes |
| --- | --- | --- |
| `playwright_hover_away` | `750f9c33f15` | Adds `hover_away()` to the gesture vocabulary and makes Playwright's `action_chains()` raise instead of returning `self`. Drops no decorators - pure infrastructure. Rebased 2026-09-21 onto dev `e0ea2c8eacc`; the one conflict was in `has_driver.py` where dev's new `active_element()`/`press()` landed at the same spot as `hover_away()` - purely additive, both sides kept, and the post-rebase diff is unchanged at 6 files / 86+ / 15-. Verified: `test/unit/selenium/` gives 485 passed, 1 skipped with chromedriver on PATH, plus a throwaway tooltip probe green under both backends. Force-pushed to the fork 2026-09-21, replacing the pre-rebase `512b7fb0e33`; merges cleanly into dev. PR description at `vault/reviews/mine/playwright_hover_away_pr_description.md`. |
| `playwright_history_panel_collections` | `e2640d8e00e` | All 9 remaining decorators dropped; no source change needed. Full file under Playwright: 9 passed, 3 failed - the 3 were already running under Playwright before this branch, are `@flakey`, and fail identically under Selenium (CI sets `GALAXY_TEST_SKIP_FLAKEY_TESTS_ON_ERROR=1` on both backends). PR description at `vault/reviews/mine/playwright_history_panel_collections_pr_description.md`. |
| `playwright_collection_builders` | `5b93f94c5ad` | All 8 decorators dropped; no source change needed. Full file under Playwright: 8 passed, no failures. Uses `@managed_history` so each test gets its own history. PR description at `vault/reviews/mine/playwright_collection_builders_pr_description.md`. |
| `playwright_history_panel` | `d2cbb2493bc` | All 5 remaining decorators dropped; no source change needed. Full file under Playwright: 7 passed in 128s, no failures. The file never reaches past the smart components - no `By`, no `ActionChains`, no `self.driver` - so there was nothing to port. PR description at `vault/reviews/mine/playwright_history_panel_pr_description.md`. |
| `playwright_admin_app` | `93fd626eaca` | All 6 decorators dropped. Five needed no change; `test_admin_toolshed` needed a real fix - `navigation.yml`'s `search_results: '#shed-search-results'` and `upgrade_notification: '#repository-table .badge'` were stale after the BTable -> GTable conversion, because `GTable` takes `id` as a prop and renders `#g-table-<id>` instead. `@flakey` plus `GALAXY_TEST_SKIP_FLAKEY_TESTS_ON_ERROR` had been hiding this on Selenium CI. Verified: 7 passed under Playwright, and `test_admin_toolshed` passes under Selenium too since the selector fix is shared code. PR description at `vault/reviews/mine/playwright_admin_app_pr_description.md`. |
| `playwright_histories_published` | `30598f1b3de` | **CI clean** - all 6 jobs green, including Playwright tests, Selenium tests and Integration Selenium. All 7 decorators dropped; no source change needed. Full file under Playwright: 7 passed in 92s, no failures. Two tests use raw element APIs (`find_element(By.CSS_SELECTOR, ...)`, `send_keys`) - both already covered by `WebElementProtocol`, so nothing to port. PR description at `vault/reviews/mine/playwright_histories_published_pr_description.md`. |
