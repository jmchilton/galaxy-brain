# workflow_editor_second_subworkflow

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_editor_second_subworkflow?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_second_subworkflow)

## Status

Implemented on `release_26.2`, head `ad783d6d3e9`; framed as a missing-test bug fix for the release. Hardened (gx_workhorse, 2026-10-20): STATUS READY, see [implementation_debrief.md](implementation_debrief.md).

No PR.

CI not yet observed.

## Scope

New E2E test (`test_workflow_editor.py::TestWorkflowEditor::test_editor_embed_two_workflows`): insert two subworkflows from the editor's Workflows panel. Brings the fix: `workflow_editor_search_for_workflow` opens the panel only when it's closed and clears the search (7d, plus `workflow_editor.workflow_activity_panel`).

Red → green: green under both Playwright and Selenium. With 7d reverted, the second insert closes the panel and times out on `.workflow-scroll-list`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Hardening added a refactor commit ahead of 7d: the panel helpers click the action inside the card titled exactly NAME, wait instead of sleeping, and use new panel search/list selectors (Codex found the first-card click could insert the wrong workflow). So 7d is no longer a clean drop from `galaxy_ui_driver` once this merges; restack instead.
