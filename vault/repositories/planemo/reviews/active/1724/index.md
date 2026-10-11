# Planemo #1724


## Marius follow-up — 2026-10-11

[Independent fix review](marius_followup_16_2026-10-11.md). Companion [jmchilton/planemo#16](https://github.com/jmchilton/planemo/pull/16) merged into the upstream feature branch on 2026-10-11. Upstream PR remains open. Decisions and follow-ups: [October ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).

## Existing output-sampling mismatch — 2026-10-11

At John’s request, filed [#1740](https://github.com/galaxyproject/planemo/issues/1740) after reproducing the plural/singular definition mode mismatch on master and this PR’s head. Real invocation output generation downloads three flat-list members or four nested paired members, versus one with explicit output sampling; inputs retain every member. The bug dates to June 2022. Sampling policy and paired-mate coverage need an explicit decision before a spelling-only correction. [Issue context and reproducible evidence](../../../issues/needs_decision/1740/index.md).
