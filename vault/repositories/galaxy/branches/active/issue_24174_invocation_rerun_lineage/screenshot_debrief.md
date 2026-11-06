Run via claude-opus-5-5 at high effort.

Screenshots successfully obtained.

2026-11-06 update on head `73352550f47`: the grid column was replaced by a compact line in the expanded row, so only the grid capture was retaken, as `workflow_rerun_lineage_grid_expanded.png` from a passing lineage E2E run (49.75 seconds). I opened it and checked it: row J is expanded and shows both links under the "Last updated" line, with the graph loaded. The Invoked column is still narrow and the Rerun column is clipped at the pane edge. The other captures below come from the earlier run, and the pages they show didn't change.

Earlier run, on head `a6e2ed29d04`: ran `lib/galaxy_test/selenium/test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_lineage` against this worktree's own Galaxy and Vite servers, using headless Playwright, timeout multiplier 2 and screenshot capture on. Result: **1 passed** in **61.55 seconds**, with one unrelated warning. The servers were stopped afterward.

I opened and checked every PNG. Each lineage banner and link can be read, the graphs and history datasets have loaded, and both rerun cards carry the Rerun badge. As before, the success toast covers the invocation title in the two post-submit captures, but the lineage banner below it stays fully visible.

| Screenshot | Evidence |
| --- | --- |
| [Simple rerun](screenshots/workflow_rerun_lineage_simple.png) | Rerun J, submitted through the simple form and refreshed, shows its "View source invocation" link. |
| [Expanded rerun](screenshots/workflow_rerun_lineage_expanded.png) | Rerun K, submitted through the expanded form and refreshed, shows its source link. |
| [Original source](screenshots/workflow_rerun_lineage_source_2.png) | Original I shows the "View latest rerun" link once J exists. |
| [Intermediate source](screenshots/workflow_rerun_lineage_source_3.png) | J shows both its source link and its latest-rerun link once K exists. |
| [Invocation cards](screenshots/workflow_rerun_lineage_list_marker.png) | Both rerun cards carry the Rerun badge; the original card has none. |
| [Invocation grid](screenshots/workflow_rerun_lineage_grid_expanded.png) | Expanded row J shows its source and latest-rerun links on one line under "Last updated". |

One environment note: the `galaxy-playwright` helper script needs `/bin/zsh`, which isn't installed on this machine, so I ran its `up`/`run`/`down` steps by hand in bash with the same environment (Galaxy :8091, Vite :5181). The screenshots are local, gitignored files.
