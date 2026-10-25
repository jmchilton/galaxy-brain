# invocation_completion_action_validation — implementation handoff

STATUS: READY

Reject unknown workflow completion-action names with HTTP 400 before creating histories or invocations, using the shared registered hook registry.

Independent branch directly from `release_26.2` at `0c70fdd5182c7425efecf7c8e76d6bd313de88b9`. Published head: `5a3307250474a7371ce3e734995186f7f54e84a8` on `jmchilton/galaxy`. No dependency on the original validation branch or the other extractions; no changes to their refs.

## Validation and review

Unknown-action API regression: failed on release baseline with 200, then passed with 400, no history and no invocation. Existing registered-export and ordinary no-hook completion API controls: 2 passed. Full installed hooks and diff checks passed. Logs: `/private/tmp/invocation-completion-action-red.log`, `-green.log`, `-positive.log`, `-hooks.log`.

Independent normal review and test challenge found no changes needed. Scope evaluation recommends retaining this extraction.

No UI or browser-test changes; API/integration tests exercise the affected behavior. Fork CI has not been assessed.

## Scope and handoff

Validate submitted action names against the existing registry, with singleton registration and constructor injection of that same registry. Scope review recommends retaining this extraction. Hook configuration, target URI validation and execution behavior remain the existing contract.

Handed off under `branches_implemented_needs_ci`; no PR created. User requested four standalone fixes on `release_26.2`.

[Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)
