# invocation_subworkflow_input_connections — rescope handoff

STATUS: READY

Report partial and wholly disconnected required subworkflow inputs consistently at runtime. The user's requested reevaluation recommended a modest expansion, implemented and independently reviewed.

Published head: `14584e545aebf88552d7204ae165125b77fc3234`. Independent base: `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Original polished scope is preserved remotely as `invocation_subworkflow_input_connections_alt_original_scope`. Existing refs were advanced without rewriting history; each branch has its original fix plus one rescope commit and no dependency on the other extractions.

## Validation and decisions

197 workflow unit tests passed, 1 skipped; 10 focused API cases passed. Independent full workflow-progress module rerun: 12 passed. Installed hooks passed. Baseline 2 failures demonstrated misleading attribution and delay, while the wholly-disconnected control passed. Logs and exact commands are recorded in `/private/tmp/subworkflow-rescope-implementation.md` and `/private/tmp/subworkflow-rescope-review-units.log`.

Normal review, fresh test challenge and strict quality review completed; acted on no corrective code changes, with no declined recommendations. Second scope evaluation recommends keeping the expanded scope. No UI changes or screenshot requirement. New-head fork CI has not been assessed; prior polish/CI evidence applies to the old head.

Handed back under `branches_implemented_needs_ci`. No PR created or edited.

[Rescope details](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Quality review](thermo_nuclear_review.md) · [Previous handoff](earlier_drafts/2/implementation_debrief.md)
