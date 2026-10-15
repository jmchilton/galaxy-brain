# Stacked invocation selection URLs — implementation handoff

STATUS: READY — extraction reviewed and both branches pushed; CI pending.

The user requested a separate prep branch for independently useful fixes and baseline tests, with new APIs kept beside their consumers. [Prep](../issue_24173_invocation_selection_prep/index.md) is pushed at `60dc8ddf598`, based on `dev` at `88127f42979`. This feature is rebased onto prep and pushed at **`a0482b43e0c`**. Review its feature-only range as `issue_24173_invocation_selection_prep...issue_24173_invocation_selection_urls`.

| Range | Files | Additions | Deletions |
| --- | ---: | ---: | ---: |
| Independent prep | 12 | 158 | 46 |
| Feature above prep | 24 | 1398 | 44 |
| Original combined change | 31 | 1556 | 90 |

The extraction removes 204 changed lines (about 12%) and seven files from the feature's review surface. Prep contains five atomic commits for order-index lookup fixes, measured graph centering, real-router notebook baseline coverage, metrics test isolation, and the existing screenshot wait. GenericItem's controlled-expansion API remains with its feature callers because existing callers do not consume that new API. URL selection, named tabs, jobs, outputs, sharing, route lifetime and mapped-job acceptance coverage remain together here.

## Preservation and validation

The rebase completed without conflicts. Both original feature head `43167c36a4c` and rebased head `a0482b43e0c` have Git tree **`83035b1de9443da8e780488afb0d933aaee65729`**; `git diff --exit-code 43167c36a4c HEAD` passes. No implementation or test content changed in the combined result. A local recovery ref `refs/backup/issue_24173_before_prep` preserves the old head; the fork update used an exact old-head force-with-lease.

Prior validation remains applicable to that identical final tree: **83 client tests across 11 suites**, graph confirmation after import cleanup, full typecheck, production build, both real-browser tests, and seven inspected screenshots passed. The earlier 92-test consolidated run also remains recorded; overlapping counts are not additive. [Fresh split test challenge](test_challenges_debrief.md) rechecks ownership and tree equality without repeating the unchanged feature suite. Prep separately passes **41 tests across six suites**, full types/build, all hooks and an independent browser test (71.85s).

[Extraction review](subagents/extraction_review.md) confirms no unintended change. [Scope evaluation](scope_evaluation.md) recommends retaining the user-approved split. The earlier phase reviews, strict review, label-resolution review, E2E polish and screenshots still cover the same final implementation; their details remain linked from [index](index.md). Original handoff/test/scope reports are archived in `earlier_drafts/3/`.

The prior feature screenshots were retained because no UI content changed; prep recorded its own browser evidence. No new scope decision is required. Both branches are registered under `branches_implemented_needs_ci`; the feature depends on prep. CI has not run, and no PR was opened. [Detailed extraction record](extraction_debrief.md).
