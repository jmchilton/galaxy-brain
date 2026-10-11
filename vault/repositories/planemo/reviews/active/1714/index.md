# Planemo #1714


## Marius follow-up — 2026-10-11

[Independent fix review](marius_followup_14_2026-10-11.md). Companion [jmchilton/planemo#14](https://github.com/jmchilton/planemo/pull/14) merged into the upstream feature branch on 2026-10-11. Upstream PR remains open. Decisions and follow-ups: [October ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).

## Configuration validation research — 2026-10-11

John requested a broader research pass prompted by #1704’s CLI/config choice mismatch. #1714 already restores shared Click type validation; focused probes confirm its helper rejects `3` from global config and profiles when given #1704’s choice list. Filed [#1739](https://github.com/galaxyproject/planemo/issues/1739) for remaining whole-file shape/key linting and a pure-validation contract for profile callbacks. [Research, source references and reproduction](../../../issues/needs_decision/1739/research_2026-10-11.md).
