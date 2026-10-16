# Rescope — 2026-10-16

User requested replacing the four extraction scope evaluations using the revised process, and implementing recommended scope changes. First reevaluation recommends a modest expansion; [recommendation](earlier_drafts/2/scope_evaluation.md). The superseded original evaluation is [archived](earlier_drafts/1/scope_evaluation.md).

Move the existing caller-supplied effective_outputs rejection before history creation alongside preference validation; cover both general/split conflicts and the adjacent metadata rejection. Preserve truthiness and error semantics.

Original polished head `90ef0b0382b6614a1bcea0204300d813baa2091e` is preserved and published as `invocation_object_store_validation_alt_original_scope`; no separate worktree or queue entry was created. Existing branch remains independent from `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`.

Implementation and validation are underway. Fresh normal review, test challenge, applicable quality review and second scope evaluation precede final handoff; previous implementation/review evidence is archived under `earlier_drafts/2/`. A further scope recommendation in that second evaluation will be parked for the user rather than expanded again.
