# tool_open_tool_shed_ids

Status: `branches_implemented_needs_ci`. Base: `dev`. No PR.

Lets tool panel search and the `tool_panel` selectors find Tool Shed tools by their full GUID id.

[Initial implementation](initial_implementation_debrief.md) · [Review](subagents/normal_review.md)

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (commit 4a, "Let tool_open find Tool Shed tools by id") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop the commit from `galaxy_ui_driver` once this merges.

**Paused 2026-10-10, mid-polish.** Normal review and test challenges are done ([test challenges](test_challenges_debrief.md)). The test-challenge agent replaced the static-HTML selector unit test with an `integration_selenium` E2E test that installs `iuc/compose_text_param` from the main Tool Shed. That change sits in local commit `7fd636774c9`, not pushed; `jmchilton` still has `953ad71c656`.

The E2E test has not been run. To run it, build this worktree's client first (`client/node_modules` is symlinked, node 22.20.0). For the red check, revert only `navigation.yml`; no rebuild is needed.

Still to do: Codex review, thermo-nuclear review, scope evaluation, screenshots, then the final debrief. John should also weigh in on dropping the 12 unit-test cases for a test that needs the network.
