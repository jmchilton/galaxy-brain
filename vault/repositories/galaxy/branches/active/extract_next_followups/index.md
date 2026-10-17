# extract_next_followups

Status: `branches_implemented`. Base: `dev`.

Fixes notebook-to-workflow extraction, report references and editor behavior after #22860.

[Implementation (pre re-harden)](earlier_drafts/1/implementation_debrief.md) · [plan](plan.md) · [Tracking history](tracking_history.md)

Recorded decisions about endpoint naming, M3 and report_title are in the implementation debrief.

## TICK — 2026-10-12

Current fork tip `113a63bb6920de19f81aaba7f83d9b53b695a911` conflicts with dev in `client/src/components/Common/GCard.test.ts`, `client/src/components/Common/GCard.vue`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

## GOOD_MORNING — 2026-10-13

Current fork head `113a63bb6920de19f81aaba7f83d9b53b695a911` conflicts with `origin/dev` in 2 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Common/GCard.test.ts` · `client/src/components/Common/GCard.vue`

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `113a63bb6920de19f81aaba7f83d9b53b695a911` found overlapping changes in 2 paths (`client/src/components/Common/GCard.test.ts`, `client/src/components/Common/GCard.vue`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.

## Re-harden — 2026-10-16

Rebased onto dev `5ff1e46b8c3` (GCard conflict was mechanical: dev re-indented the header; kept dev's markup + `icon-only color="red"`, appended the clear-title tests). Head `3c5a53c2c4f` pushed to fork; GCard/extraction/PageEditor vitest 267 and extract unit 55 pass. Earlier debrief moved to `earlier_drafts/1/`; hardening steps in progress.
