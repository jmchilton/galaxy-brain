# Initial implementation debrief — workflow_open_exact_title

Recovered from `index.md`; branch built outside the workhorse process. Base `release_26.2` (`65132d40dac`). Commits cherry-picked from `galaxy_ui_driver`, then the test:

1. `52bf95992d2` Open the workflow titled NAME in workflow_index_open_with_name (7c, with unit tests in `test/unit/selenium/test_workflow_index.py`)
2. `11733f6b0f9` Open the run form of the workflow titled NAME in workflow_run_with_name (7g; context conflict brought 5d's one-line docstring)
3. `b9c9894b63c` Test opening and running a workflow whose title prefixes another's

## Test

`test_workflow_editor.py::TestWorkflowEditor::test_open_and_run_workflow_by_exact_title` — open and run a workflow whose title is a prefix of a newer workflow's title.

## Red → green

- Green under Playwright and Selenium; unit tests pass.
- All fixes reverted: editor opens `NAME (copy)`.
- Only 7g reverted: run form opens sibling's id.
- Existing `assert_wf_name_is` uses `in`, can't tell the two apart; test compares exactly.

## Decision (2026-10-20)

7i (colon-free search term) left out. With it reverted, `GTN Training: X`, `GTN:X`, `tag:X` all open fine on 26.2; `client/src/utils/filtering.ts` identical on dev. 7i only works around test.galaxyproject.org's older client; stays on `galaxy_ui_driver`.
