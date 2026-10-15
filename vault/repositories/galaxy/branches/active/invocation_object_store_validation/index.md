# invocation_object_store_validation

Status: `branches_implemented_needs_ci`. Implementation: READY. Base: `release_26.2` (`0c70fdd5182`). Head: `f862f9f9f4d`.

Reject invalid workflow object-store preferences with HTTP 400 before creating a target history; preserve valid single-store and split-store selections.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Fork CI remains to be assessed.
