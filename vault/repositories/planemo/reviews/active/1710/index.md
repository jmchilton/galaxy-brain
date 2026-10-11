# Planemo #1710


## Marius companion #6 — 2026-10-11

[Independent fix review](marius_followup_6_2026-10-11.md). Companion #6 merged into shed-lint-fail-fast as cac00fc00b182b0775599e3b8fe6ddf35ee8dd73. Focused suites: 23 passed/7 skipped with Tool Shed response stub; two sibling CLI regressions pass and failed before fix. Upstream PR remains open. Decisions and follow-ups: [October ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).

## Documentation follow-ups — 2026-10-11

Pushed commit `605533257f7573ac258125270464fe9c94574a8f` to [shed-lint-fail-fast](https://github.com/jmchilton/planemo/tree/shed-lint-fail-fast). Findings two and three are complete: 11 generated command references now match the corrected shared help; unreleased HISTORY documents the default warning threshold and the error-only override. All four existing fail-fast regression tests passed; every updated command reference was checked against its CLI help. Only the requested generated-help changes were retained from the generator, avoiding unrelated documentation drift. No runtime code or tests changed. Back with reviewers/CI.
