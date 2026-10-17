One behavior-preserving refactor commit inserted after the baseline tests: `36f6506bc5b` extracts the base's exact-then-suffix collection type matching from `FormData.vue` into `collectionMatch.ts` `matchCollectionType()`. The fix commit now changes only that helper's body (and the test table).

## Commits (d45d2fdb3bc..HEAD)

1. `59d9f797cc3` Baseline tests for collection drop matching (unchanged)
2. `36f6506bc5b` Extract dropped collection type matching into a helper (new)
3. `56735197126` Match dropped collections to inputs like the server (was `34d230970c2`)
4. `27146fc2ef7` Map dropped collection elements over inputs like collections (was `cad546e2159`)

The final tree is identical to `cad546e2159`. Backup ref: `backup/issue_24220_pre_baseline_refactor`.

## Refactor

- `matchCollectionType(collectionType, inputTypes)` with 26.0 semantics: `includes` gives `{ mapOverType: null }`, then the first `endsWith` input type gives `{ mapOverType }`, else `null`. Same return shape as the fixed helper.
- `toDataOption` (HDCA branch) uses it in place of the inline `includes`/`find(endsWith)`.
- `canAcceptSrc` uses it in place of the separate `includes` and `some(endsWith)` branches. Both branches ran the same column-definition check, so they collapse into one.
- The fix commit's `FormData.vue` diff is now empty. Its diff is the helper rewritten onto `CollectionTypeDescription.canMatch`/`canMapOver` plus the test-table flips, so reviewers see only the semantics change.

## Not refactored

- DCE `collectionType` via `getElementAttributes` in `toDataOption`: this changes behavior (DCEs gain `batch`/`map_over_type`), so it stays in the fix commit.
- Moving the helper into `collectionTypeDescription.ts` and collapsing the two drop gates: deferred as dev follow-ups (see thermo-nuclear review).

## Verification

- At `36f6506bc5b`: vitest Form + Workflow 55 files / 319 tests pass, which includes the baseline tests. Prettier is clean, eslint has 0 errors (2 pre-existing `any` warnings), and `vue-tsc --noEmit` is clean.
- At HEAD: vitest Form + Workflow 55 files / 330 tests pass.
- No Python changes, so the API test was not re-run. `test_tools.py` is byte-identical.
