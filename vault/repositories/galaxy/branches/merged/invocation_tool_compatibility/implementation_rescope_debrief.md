# Rescope — 2026-10-16

User requested replacing the four extraction scope evaluations using the revised process, and implementing recommended scope changes. First reevaluation recommends a modest expansion; [recommendation](earlier_drafts/2/scope_evaluation.md). The superseded original evaluation is [archived](earlier_drafts/1/scope_evaluation.md).

Deduplicate identical ID/version/UUID references across nested workflows using the existing collector semantics; preserve distinct versions/UUIDs, traversal order and missing-tool precedence.

Original polished head `27e7daa34344d1a99066102e57dd45e894acac41` is preserved and published as `invocation_tool_compatibility_alt_original_scope`; no separate worktree or queue entry was created. Existing branch remains independent from `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`.

Rescope completed at published head `77fe189f505160101d2d087248ad83c645aeb220`. 11 API cases passed, including compatible execution. Independent helper-cleanup rerun: all 10 invalid-request cases passed. Installed hooks passed. Baseline 6 failed on repeated diagnostics and 4 top-level controls passed. Logs: `/private/tmp/tools-rescope-{red,green,hooks}.log`, `/private/tmp/tools-rescope-review-{green,hooks}.log`.

Fresh independent normal review and test challenge completed (test helper reuse); no recommendations declined. Fresh strict quality review found no blocker. [Second scope evaluation](scope_evaluation.md) recommends KEEP the expanded implementation, so no user scope decision is needed. No client/browser changes were made.

STATUS: READY. Handed back under `branches_implemented_needs_ci`; new-head fork CI has not been assessed. Earlier polish/CI evidence is historical and does not approve this changed head. No PR was opened or changed. [Final implementation](implementation_debrief.md).
