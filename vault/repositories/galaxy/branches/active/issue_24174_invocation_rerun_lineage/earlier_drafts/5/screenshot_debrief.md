Screenshots successfully obtained.

Followed `GX_PROCESS_SCREENSHOTS.md` and the E2E writing guide. Ran `lib/galaxy_test/selenium/test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_lineage` against the isolated task backend and Vite servers using Playwright, headless Chromium, timeout multiplier 2, and screenshot capture enabled. Final result: **1 passed**, one unrelated Google GenAI deprecation warning, in **107.84 seconds**. Final run log: `/tmp/issue24174-screenshot-e2e-final3.log`.

Opened and visually inspected every final PNG. The lineage banners and links are readable, graphs and history datasets have loaded, rerun badges appear on cards, and the grid shows two Rerun values with a blank original invocation value. The grid capture deliberately scrolls horizontally to expose Run type in the narrow center pane. Existing success animation may overlay the navigation title in post-submit captures, while the lineage banner remains fully visible. Card scheduling status can briefly lag finished datasets; it does not obscure rerun badges.

| Screenshot | Evidence |
| --- | --- |
| [Simple rerun](screenshots/workflow_rerun_lineage_simple.png) | J rerun submitted through the simple form, refreshed, showing its source link. |
| [Expanded rerun](screenshots/workflow_rerun_lineage_expanded.png) | K rerun submitted through the expanded form, refreshed, showing its source link. |
| [Original source](screenshots/workflow_rerun_lineage_source_2.png) | I shows the latest-rerun link after J exists. |
| [Intermediate source](screenshots/workflow_rerun_lineage_source_3.png) | J shows both its source link and latest-rerun link after K exists. |
| [Invocation cards](screenshots/workflow_rerun_lineage_list_marker.png) | Both rerun cards carry the Rerun badge. |
| [Invocation grid](screenshots/workflow_rerun_lineage_grid_markers.png) | Run type labels on both reruns, blank Run type on the original. |

Earlier incomplete or less useful captures were preserved under `earlier_drafts/1/screenshots/`, `earlier_drafts/2/screenshots/`, and `earlier_drafts/3/screenshots/`. Improvements were limited to test readiness waits, state-aware grid navigation, a presence assertion for an intentionally empty cell, and scrolling the tested column into the screenshot. No UI implementation change was needed during screenshot review. Final screenshots remain local ignored artifacts as required.
