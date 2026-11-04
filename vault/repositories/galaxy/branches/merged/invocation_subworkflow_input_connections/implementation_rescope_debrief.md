# Rescope — 2026-10-16

User requested replacing the four extraction scope evaluations using the revised process, and implementing recommended scope changes. First reevaluation recommends a modest expansion; [recommendation](earlier_drafts/2/scope_evaluation.md). The superseded original evaluation is [archived](earlier_drafts/1/scope_evaluation.md).

Report disconnected required subworkflow inputs consistently at runtime, before resolving connected outputs, instead of blaming an unrelated sibling output or waiting for it. Preserve the existing wholly-disconnected failure schema/details.

Original polished head `bdbbdfcd2cc8a2a80306d0d0f28aa9445c5e3768` is preserved and published as `invocation_subworkflow_input_connections_alt_original_scope`; no separate worktree or queue entry was created. Existing branch remains independent from `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`.

Rescope completed at published head `14584e545aebf88552d7204ae165125b77fc3234`. 197 workflow unit tests passed, 1 skipped; 10 focused API cases passed. Independent full workflow-progress module rerun: 12 passed. Installed hooks passed. Baseline 2 failures demonstrated misleading attribution and delay, while the wholly-disconnected control passed. Logs and exact commands are recorded in `/private/tmp/subworkflow-rescope-implementation.md` and `/private/tmp/subworkflow-rescope-review-units.log`.

Fresh independent normal review and test challenge completed (no corrective code changes); no recommendations declined. Fresh strict quality review found no blocker. [Second scope evaluation](scope_evaluation.md) recommends KEEP the expanded implementation, so no user scope decision is needed. No client/browser changes were made.

STATUS: READY. Handed back under `branches_implemented_needs_ci`; new-head fork CI has not been assessed. Earlier polish/CI evidence is historical and does not approve this changed head. No PR was opened or changed. [Final implementation](implementation_debrief.md).
