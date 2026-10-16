# invocation_tool_compatibility — implementation handoff

STATUS: READY

Reject workflow-incompatible tools before creating histories or invocations, preserving existing missing-tool lookup behavior and diagnostics.

Independent branch directly from `release_26.2` at `0c70fdd5182c7425efecf7c8e76d6bd313de88b9`. Published head: `8c8c67e4ae55a913be660e8912fd87a752e6ad9c` on `jmchilton/galaxy`. No dependency on the original validation branch or the other extractions; no changes to their refs.

## Validation and review

Four new API cases failed on the release baseline: incompatible tools were accepted, and missing-tool requests left histories. Final selection: 5 passed, including compatible workflow execution, new/existing history targets, missing-tool precedence and exact/plain error messages. Full installed hooks and diff checks passed. Logs: `/private/tmp/invocation-tool-compatibility-red.log`, `-green.log`, `-hooks.log`.

Independent normal review and test challenge found no changes needed. Scope evaluation recommends retaining this extraction.

No UI or browser-test changes; API/integration tests exercise the affected behavior. Fork CI has not been assessed.

## Scope and handoff

Resolve each workflow tool reference once with the same version/UUID/exact/user options as the existing availability check. Use cached compatibility metadata and retain the scheduling backstop. Scope and strict code-quality reviews recommend retaining this extraction.

Handed off under `branches_implemented_needs_ci`; no PR created. User requested four standalone fixes on `release_26.2`.

[Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)
