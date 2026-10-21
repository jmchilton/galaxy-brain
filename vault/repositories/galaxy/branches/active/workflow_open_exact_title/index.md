# workflow_open_exact_title

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_open_exact_title?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_open_exact_title)

## Status

Implemented on `release_26.2`, head `fc5802715a1`; framed as a missing-test bug fix for the release. Hardened + re-scoped (gx_workhorse, 2026-10-20): STATUS READY, see [implementation_debrief.md](implementation_debrief.md). Alt: `workflow_open_exact_title_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

No PR.

CI not yet observed.

## Scope

New E2E test (`test_workflow_editor.py::TestWorkflowEditor::test_open_and_run_workflow_by_exact_title`): open and run a workflow whose title is a prefix of a newer workflow's title. Brings the fixes: `workflow_index_open_with_name` (7c, with unit tests) and `workflow_run_with_name` (7g) wait for the card titled exactly NAME. A context conflict on 7g brought 5d's one-line docstring along.

Red → green: green under both Playwright and Selenium; unit tests pass. With all fixes reverted, the editor opens `NAME (copy)`. With only 7g reverted, the run form opens the sibling's id. The existing `assert_wf_name_is` uses `in` and can't tell the two apart, so the test compares exactly.

Decision (2026-10-20): 7i (colon-free search term) left out. With it reverted, titles `GTN Training: X`, `GTN:X` and `tag:X` all open fine on 26.2. `client/src/utils/filtering.ts` is identical on dev. 7i only works around test.galaxyproject.org's older client, so it stays on `galaxy_ui_driver` and goes up with gxui.

Re-scope (2026-10-20): `workflow_delete_by_name` / `workflow_bookmark_by_name` also act on the card titled NAME (the old delete clicked the first card's menu item), with an E2E test (`test_workflow_management.py::test_workflow_bookmark_and_delete_by_exact_title`). Also a 3-line Playwright `find_elements` snapshot fix (count-then-nth could stall 30s when the list shrank). The 7c unit test file was dropped (John's call). Decisions: one PR vs split the driver fix; keep the test's explicit `workflow_index_open()`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop 7c/7g from `galaxy_ui_driver` once this merges.
