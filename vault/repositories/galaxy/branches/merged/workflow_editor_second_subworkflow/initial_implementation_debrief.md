# Initial implementation debrief — workflow_editor_second_subworkflow

Recovered from `index.md`; branch built outside the workhorse process. Base `release_26.2` (`65132d40dac`). Commit cherry-picked from `galaxy_ui_driver`, then the test:

1. `c4ffd2b46c3` Insert a second subworkflow from the editor's Workflows panel (7d, plus `workflow_editor.workflow_activity_panel` selector)
2. `e1348b9f213` Test inserting two subworkflows from the editor's Workflows panel

## Test

`test_workflow_editor.py::TestWorkflowEditor::test_editor_embed_two_workflows` — insert two subworkflows from the editor's Workflows panel.

## Red → green

- Green under Playwright and Selenium.
- 7d reverted: second insert closes the panel, times out on `.workflow-scroll-list`.
