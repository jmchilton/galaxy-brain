# invocation_completion_action_validation

Status: `branches_implemented_needs_ci`. Implementation: READY. Base: `release_26.2` (`0c70fdd5182`). Head: `5a330725047`.

Reject unknown workflow completion-action names with HTTP 400 before creating histories or invocations, using the shared registered hook registry.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Fork CI remains to be assessed.
