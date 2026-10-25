# ag_grid_testing_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:ag_grid_testing_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/ag_grid_testing_26.2)

Status: `ci_wait` (draft PR). Base: `release_26.2`.

Missing ag-grid E2E tests (data landing cell edits, paired builder rename) + shared `ag_grid_edit_cell` helper, split out of [ag_grid_36](../ag_grid_36/index.md).

## Status

`ready`: polished, head `71bfc69c498` on `release_26.2`.

[#24397](https://github.com/galaxyproject/galaxy/pull/24397) undrafted 2026-10-24 (tick).

PR CI green except Main tool tests (disk quota exceeded, infra) and Converter tests (client/selenium-only change, converter flaky on release bases), unrelated; reruns queued.

## Decisions

- 2026-10-23: John asked for these commits on a 26.2 branch and for polish without hardening; they were hardened as part of `ag_grid_36` (see its [implementation debrief](../ag_grid_36/implementation_debrief.md), [codex review](../ag_grid_36/codex_review.md), [E2E polish](../ag_grid_36/polish_e2e_tests_debrief.md)).
- Cleanup commit `0dc06dc46d2` left on `ag_grid_36` (refactor, not a test/bug fix).
