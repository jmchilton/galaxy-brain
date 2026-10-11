# Planemo #1725

## Refresh review after Marius merge — 2026-10-11

[Latest review](refresh_review_2026-10-11.md). [Suggested replacement PR description](pr_description_client_fallback_2026-10-11.md).

Reviewed head: `c95fd681c979b127e7667f30585a7bdd7e6bce0f`; base: `b8547ffde67eb0c88998a818dfbdd075327c1ead`. The PR still fixes explicit `--test_data` for tool XML tests through the client fallback, including expected output fixtures. No remaining blocking code issue found. Significantly rewrite the description around that final behavior; the dual-fix claims, server override tradeoff, old verification table, and draft-state sentence are stale.

Validation: 8 new before/after behavioral probes and 6 existing client/configuration probes passed. Actual interactor input and output resolution fails on the original base after a server miss and succeeds on the merged head; server-provided fixtures win on both. Full managed-Galaxy execution was not run.

Delivery: refresh review provided privately in Codex; no GitHub review/comment or PR description edit. The replacement description is a draft for John. Upstream remains open and ready for review (not draft); Marius's change-request review targets pre-merge `72eb17b2`. All 14 checks on the merged head were pending at the refreshed GitHub snapshot. Current managed-Galaxy CI confirmation remains outstanding.


## Marius companion #8 — 2026-10-11

[Independent fix review](marius_followup_8_2026-10-11.md). Companion #8 merged into test-data-option-fix as c95fd681c979b127e7667f30585a7bdd7e6bce0f. Configuration suite: 48 passed/3 skipped; six client/configuration probes passed. Full managed-Galaxy test remains for CI. Upstream PR remains open. Decisions and follow-ups: [October ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).
