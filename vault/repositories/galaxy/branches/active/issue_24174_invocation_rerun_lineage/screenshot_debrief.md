Run via claude-opus-5-5 at high effort.

Screenshots successfully obtained.

Followed `GX_PROCESS_SCREENSHOTS.md` and the E2E writing guide on head `a6e2ed29d04` (`cfe3e41cbd2`, which swaps the grid's Run type text column for a header-less rerun icon column, plus a one-line test fix). Ran `lib/galaxy_test/selenium/test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_lineage` against this worktree's own Galaxy and Vite servers, using headless Playwright, timeout multiplier 2 and screenshot capture on. Result: **1 passed** in **61.55 seconds**, with one unrelated warning. The servers were stopped afterward.

I opened and checked every PNG. Each lineage banner and link can be read, the graphs and history datasets have loaded, and both rerun cards carry the Rerun badge. In the grid, the new icon column sits right after the expand caret with no header text: a muted rerun icon shows on both rerun rows, the original row's cell is empty, and nothing in the column is clipped. Because the column now sits at the left, the grid capture no longer scrolls sideways, and the Invoked column is cut off at the right edge of the narrow center pane. As before, the success toast covers the invocation title in the two post-submit captures, but the lineage banner below it stays fully visible.

| Screenshot | Evidence |
| --- | --- |
| [Simple rerun](screenshots/workflow_rerun_lineage_simple.png) | Rerun J, submitted through the simple form and refreshed, shows its "View source invocation" link. |
| [Expanded rerun](screenshots/workflow_rerun_lineage_expanded.png) | Rerun K, submitted through the expanded form and refreshed, shows its source link. |
| [Original source](screenshots/workflow_rerun_lineage_source_2.png) | Original I shows the "View latest rerun" link once J exists. |
| [Intermediate source](screenshots/workflow_rerun_lineage_source_3.png) | J shows both its source link and its latest-rerun link once K exists. |
| [Invocation cards](screenshots/workflow_rerun_lineage_list_marker.png) | Both rerun cards carry the Rerun badge; the original card has none. |
| [Invocation grid](screenshots/workflow_rerun_lineage_grid_markers.png) | The header-less icon column after the expand caret shows the muted rerun icon on both reruns and is empty for the original. |

The first run failed at the grid step: the test read the marker's text with `get_attribute("textContent")`, which returns `None` under Playwright because it reads HTML attributes only. Commit `a6e2ed29d04` asserts on the marker's `title` attribute instead (not pushed). The UI needed no changes. One environment note: the `galaxy-playwright` helper script needs `/bin/zsh`, which isn't installed on this machine, so I ran its `up`/`run`/`down` steps by hand in bash with the same environment (Galaxy :8091, Vite :5181). The screenshots are local, gitignored files.
