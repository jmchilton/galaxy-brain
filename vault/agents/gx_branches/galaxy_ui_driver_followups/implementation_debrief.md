# galaxy_ui_driver_followups implementation debrief

2026-10-07. Tip `8d4434b6256`, based on the testing session's `galaxy_ui_driver`
snapshot `f561c00528d`. Worktree:
`~/projects/worktrees/galaxy/branch/galaxy_ui_driver_followups`.

Moves reusable upload helpers, the workflow output UI wait, and gxui into
`galaxy.selenium` / `galaxy-selenium`, with compatibility imports and launchers.
Keeps test-populator fixture staging in the test framework. Separately splits a
pre-existing mixed core/test-framework context test so the standalone core suite
collects without `galaxy_test`.

**Integration branch — do not PR or polish independently.** The testing session
should put helper and context-test commits below its final gxui commit and fold
the package relocation into that tip. No changes were made to its worktree or
running tests. No CI verdict is claimed for this integration branch.

[Full handoff: commits, dependency decisions, validation and integration notes](../../../projects/playwright/GXUI_PACKAGE_MOVE_HANDOFF.md).
