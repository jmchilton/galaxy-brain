Run via claude-opus-5-5 at high effort.

Screenshots successfully obtained.

Followed `GX_PROCESS_SCREENSHOTS.md` and the E2E writing guide on head `830d058c5be` (rebased onto dev, with the batched lineage queries). Ran `lib/galaxy_test/selenium/test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_lineage` against this worktree's own Galaxy and Vite servers, using headless Playwright, timeout multiplier 2 and screenshot capture on. Result: **1 passed** in **89.67 seconds**, with one unrelated warning. The servers were stopped afterward.

I opened and checked every PNG. Each lineage banner and link can be read, the graphs and history datasets have loaded, both rerun cards carry the Rerun badge, and the grid shows Rerun for both reruns and a blank Run type for the original. The captures match the earlier run (`earlier_drafts/5/screenshot_debrief.md`), and the batched lineage resolution changed nothing visible. As before, the success toast covers the invocation title in the two post-submit captures, but the lineage banner below it stays fully visible. The grid capture scrolls sideways so the Run type column shows in the narrow center pane.

| Screenshot | Evidence |
| --- | --- |
| [Simple rerun](screenshots/workflow_rerun_lineage_simple.png) | Rerun J, submitted through the simple form and refreshed, shows its "View source invocation" link. |
| [Expanded rerun](screenshots/workflow_rerun_lineage_expanded.png) | Rerun K, submitted through the expanded form and refreshed, shows its source link. |
| [Original source](screenshots/workflow_rerun_lineage_source_2.png) | Original I shows the "View latest rerun" link once J exists. |
| [Intermediate source](screenshots/workflow_rerun_lineage_source_3.png) | J shows both its source link and its latest-rerun link once K exists. |
| [Invocation cards](screenshots/workflow_rerun_lineage_list_marker.png) | Both rerun cards carry the Rerun badge; the original card has none. |
| [Invocation grid](screenshots/workflow_rerun_lineage_grid_markers.png) | Run type reads Rerun for both reruns and is blank for the original. |

No test or UI changes were needed and nothing was committed. One environment note: the `galaxy-playwright` helper script needs `/bin/zsh`, which isn't installed on this machine, so I ran its `up`/`run`/`down` steps by hand in bash with the same environment (Galaxy :8091, Vite :5181). The screenshots are local, gitignored files.
