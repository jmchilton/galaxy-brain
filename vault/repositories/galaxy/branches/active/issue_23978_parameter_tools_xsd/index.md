# issue_23978_parameter_tools_xsd

Status: `branches_implemented_needs_ci`. Base: `dev`.

Makes parameter framework tools XSD-valid and checks them in CI (#23978).

[Codex review](codex_review.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Tracking history](tracking_history.md)

The parent PR opens first; preserve the recorded parent dependency when opening this branch.

## TICK — 2026-10-11

Current head has green tool/workflow framework, API, lint, Selenium and integration-Selenium checks; Playwright workflow runtime-parameter timeout and social-core package failure remain. The recorded key coverage is CircleCI `validate_test_tools`; no successful current-head status for that check was found, so retain needs CI rather than claiming XML validation ran.
