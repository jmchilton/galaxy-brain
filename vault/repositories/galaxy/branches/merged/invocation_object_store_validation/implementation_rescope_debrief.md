# Rescope — 2026-10-16

User requested replacing the four extraction scope evaluations using the revised process, and implementing recommended scope changes. First reevaluation recommends a modest expansion; [recommendation](earlier_drafts/2/scope_evaluation.md). The superseded original evaluation is [archived](earlier_drafts/1/scope_evaluation.md).

Move the existing caller-supplied effective_outputs rejection before history creation alongside preference validation; cover both general/split conflicts and the adjacent metadata rejection. Preserve truthiness and error semantics.

Original polished head `90ef0b0382b6614a1bcea0204300d813baa2091e` is preserved and published as `invocation_object_store_validation_alt_original_scope`; no separate worktree or queue entry was created. Existing branch remains independent from `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`.

Rescope completed at published head `000233d81ebccaea171682cc5bdeb00b99da8ac4`. 7 API cases and 4 object-store integration cases passed. After invocation-helper cleanup, all 6 negative API cases passed again; installed hooks passed. Baseline demonstrated 1 failing no-history regression and 2 already-passing conflict controls. Logs: `/private/tmp/object-store-rescope-{red,green,integration,hooks}.log`, `/private/tmp/object-store-rescope-review-{green,hooks}.log`.

Fresh independent normal review and test challenge completed (test helper reuse); no recommendations declined. Fresh strict quality review found no blocker. [Second scope evaluation](scope_evaluation.md) recommends KEEP the expanded implementation, so no user scope decision is needed. No client/browser changes were made.

STATUS: READY. Handed back under `branches_implemented_needs_ci`; new-head fork CI has not been assessed. Earlier polish/CI evidence is historical and does not approve this changed head. No PR was opened or changed. [Final implementation](implementation_debrief.md).
