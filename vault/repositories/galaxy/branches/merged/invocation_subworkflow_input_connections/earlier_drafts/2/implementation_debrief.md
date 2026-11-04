# invocation_subworkflow_input_connections — implementation handoff

STATUS: READY

Reject disconnected required subworkflow inputs with HTTP 400 before creating histories or invocations, including nested step paths, while preserving optional and defaulted inputs.

Independent branch directly from `release_26.2` at `0c70fdd5182c7425efecf7c8e76d6bd313de88b9`. Published head: `50fe009221340b21ec685a50dbcbb6fcf29310f1` on `jmchilton/galaxy`. No dependency on the original validation branch or the other extractions; no changes to their refs.

## Validation and review

Four negative API cases failed on the release baseline with 200, then passed with 400, error code/path and no history/invocation/job side effects. Final API selection: 10 passed, including false/zero/empty defaults and existing default/optional/connected execution controls. Workflow units: 193 passed, 2 skipped. Full installed hooks and diff checks passed. Logs: `/private/tmp/invocation-subworkflow-input-red.log`, `-green.log`, `-unit.log`, `-hooks.log`.

Independent normal review and test challenge found no changes needed. Scope evaluation recommends retaining this extraction.

No UI or browser-test changes; API/integration tests exercise the affected behavior. Fork CI has not been assessed.

## Scope and handoff

Share the existing required/connected/default predicate between recursive submission validation and the retained runtime backstop. Preserve runtime failure semantics. Scope and strict code-quality reviews recommend keeping this independent structural check.

Handed off under `branches_implemented_needs_ci`; no PR created. User requested four standalone fixes on `release_26.2`.

[Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)
