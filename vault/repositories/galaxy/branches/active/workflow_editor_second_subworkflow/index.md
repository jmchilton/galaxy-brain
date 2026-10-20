# workflow_editor_second_subworkflow

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_editor_second_subworkflow?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_second_subworkflow)

## Status

Implemented on `release_26.2`, head `e1348b9f213`; framed as a missing-test bug fix for the release.

No PR.

CI not yet observed.

## Scope

New E2E test (`test_workflow_editor.py::TestWorkflowEditor::test_editor_embed_two_workflows`): insert two subworkflows from the editor's Workflows panel. Brings the fix: `workflow_editor_search_for_workflow` opens the panel only when it's closed and clears the search (7d, plus `workflow_editor.workflow_activity_panel`).

Red → green: green under both Playwright and Selenium. With 7d reverted, the second insert closes the panel and times out on `.workflow-scroll-list`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop 7d from `galaxy_ui_driver` once this merges.
