# workflow_editor_connection_helpers

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_editor_connection_helpers?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_connection_helpers)

## Status

Head `8380a8c1026` on `release_26.2` `7febcc1d683`: implemented, needs polish; the new test passes locally on Playwright and Selenium.

No PR yet.

No CI yet.

## Scope

New E2E test, `test_workflow_editor.py::TestWorkflowEditor::test_refused_connection_and_removed_step`. It covers a refused connection with its reason, connect, disconnect, reconnect, removing a step, and the save, checked through the API. It brings three changes:
- the editor's connection helpers move from the test class onto `NavigatesGalaxy`;
- new `workflow_editor_try_connect` and `workflow_editor_remove_node` helpers;
- a fix to Playwright's synthetic drag timing.

Base `release_26.2` on John's call (2026-10-21), not dev as [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md) says. It backs gxui's editor verbs (pitch refinement plan item 5). [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) is stacked on it, so restack that branch after any rewrite here.

[Implementation debrief](implementation_debrief.md)
