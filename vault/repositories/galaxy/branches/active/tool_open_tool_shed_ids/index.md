# tool_open_tool_shed_ids

Status: `branches_implemented_needs_ci`. Base: `dev`. No PR.

Lets tool panel search and the `tool_panel` selectors find Tool Shed tools by their full GUID id, with an `integration_selenium` E2E test.

Open decision for John: keep the E2E-only test change, or restore the dropped selector unit test (see implementation debrief).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (commit 4a, "Let tool_open find Tool Shed tools by id") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop the commit from `galaxy_ui_driver` once this merges.

