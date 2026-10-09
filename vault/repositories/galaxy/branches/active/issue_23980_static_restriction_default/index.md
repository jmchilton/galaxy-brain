# issue_23980_static_restriction_default

Status: `branches_implemented_needs_ci`. Base: `dev`.

Preselects defaults for statically restricted workflow text inputs (#23980).

[Codex review](codex_review.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

Fork CI on `9b44c7b0b30` (2026-10-09): only 6 workflows ran. Selenium shard 0 red is unrelated: setup `ReadTimeoutError` on the first test (`test_admin_dependencies_display`); the new `test_execution_with_text_default_value_and_static_restrictions` passed (133 passed, 1 error). Playwright, Integration Selenium, packages and lint are green. API tests never ran, and they exercise the new `test_workflows.py` cases, so the branch stays here until they run.
