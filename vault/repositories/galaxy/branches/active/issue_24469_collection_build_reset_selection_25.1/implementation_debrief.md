# Implementation debrief

STATUS: READY. Head `33914ab23fd` on `jmchilton`, base `release_25.1`.

```
exists .../differential-review/snapshots/20261026T145913Z-hardening-33914ab23fdc.json
  hardening @ 33914ab23fdc vs origin/release_25.1 (merge-base a2e6ecf48277)
  since 20261026T144907Z-implementation-87435d24ee99: 1 changed commit, 7 hunks carried, 2 changed, 1 new
```

## Fix

Issue's root cause was half right. Auto/Advanced Build List go through `listWizard()` (route to `ListWizard`), not the `CollectionCreatorIndex` modal whose `createdCollection` handler was deleted. `SelectionOperations.vue` now emits `update:show-selection` false in `listWizard()` after copying the selection to the builder store, and restores `createdCollection()` for the build-list-all modal. `useSelectedItems` resets the selection when show-selection goes false, so no `reset-selection` emit (matches `runOnSelection`).

Tradeoff: cancelling the wizard drops the selection. Clearing only on successful create needs wizard→history-panel plumbing across routes; left for reviewer.

## Tests

- `206d8cb3a59` Baseline tests: `listWizard` hands selection to store + routes.
- Jest: creator modal `created-collection` exits selection (red→green). Wizard Jest test dropped in test challenge — Selenium covers it.
- Selenium: `_assert_selection_cleared` (new `navigation.yml` targets) in auto + advanced build tests; red without fix, file 8/8 green.

## Hardening

[test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [codex](codex_review.md) (no findings) · [baseline refactor](baseline_refactor.md) (none) · [scope](scope_evaluation.md) (keep) · [screenshots](screenshot_debrief.md) · [review](subagents/normal_review_1.md). Thermo-nuclear skipped (<50 lines). Format/prettier/black clean; mypy no errors in changed file.

Notes: 25.1 Selenium has no Playwright backend (ran Chrome). `CollectionCreatorIndex` missing required `extendedCollectionType` prop from `SelectionOperations` — pre-existing Vue warning on dev too, not fixed.
