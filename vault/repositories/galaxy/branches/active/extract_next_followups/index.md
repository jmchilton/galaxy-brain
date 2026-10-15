# extract_next_followups

Status: `branches_implemented`. Base: `dev`.

Fixes notebook-to-workflow extraction, report references and editor behavior after #22860.

[Implementation](implementation_debrief.md) · [plan](plan.md) · [Tracking history](tracking_history.md)

Recorded decisions about endpoint naming, M3 and report_title are in the implementation debrief.

## TICK — 2026-10-12

Current fork tip `113a63bb6920de19f81aaba7f83d9b53b695a911` conflicts with dev in `client/src/components/Common/GCard.test.ts`, `client/src/components/Common/GCard.vue`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

## GOOD_MORNING — 2026-10-13

Current fork head `113a63bb6920de19f81aaba7f83d9b53b695a911` conflicts with `origin/dev` in 2 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Common/GCard.test.ts` · `client/src/components/Common/GCard.vue`
