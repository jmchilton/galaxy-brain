# tool_open_tool_shed_ids

Status: `branches_implemented_needs_ci`. Base: `dev`. No PR.

Lets tool panel search, the `tool_panel` selectors, and the `tools_list` card selectors find Tool Shed tools by their full GUID id. Covered by `integration_selenium` E2E tests.

Open decision for John: keep the E2E-only test change, or restore the dropped selector unit test (see implementation debrief).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Fold-in review](subagents/normal_review_tools_list.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Earlier drafts](earlier_drafts/1/implementation_debrief.md)

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (commit 4a, "Let tool_open find Tool Shed tools by id") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop the commit from `galaxy_ui_driver` once this merges.


## TICK — 2026-10-11

Live fork tip is now `5daa04de0879e17b6038d009cadbd4553730a5a0`; current-SHA workflows are queued/pending without failures. Retain needs CI and the existing test-scope decision.
