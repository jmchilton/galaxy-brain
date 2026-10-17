Extended the existing refactor commit: `8dcf21ccad0` now also flattens `canAcceptSrc`'s collection branch into early returns, with no behavior change. The two re-scope fix commits now show only their semantic changes, without the re-indent.

## Commits (d45d2fdb3bc..HEAD)

1. `622d604a43e` Baseline tests for collection drop matching (unchanged)
2. `8dcf21ccad0` Extract dropped collection type matching into a helper (was `cae496c3483`, amended)
3. `f11e05aefc5` Match dropped collections to inputs like the server (was `4854433d9cd`)
4. `2338074fe14` Map dropped collection elements over inputs like collections (was `e42b197b14c`)
5. `07e9cc7a177` Check sample sheet column definitions only on direct drops (was `28030136541`)
6. `f6ff31f7187` Accept any dropped collection when an input declares no collection types (was `2db71555be5`)

The final tree is identical to `2db71555be5`. The 24218 commits are untouched.

## Refactor

- The refactor commit keeps the earlier `matchCollectionType()` extraction (see `earlier_drafts/1/baseline_refactor.md`). It now also reshapes `canAcceptSrc`'s collection path at base semantics: throw if there is no type, return true if `!props.collectionTypes`, run `match`, alert and return false if nothing matches, run the column-definition check, then return true. That is the same shape HEAD had.
- `07e9cc7a177` is now a comment change plus one `match.mapOverType === null &&` line. It was a nested-block edit.
- `f6ff31f7187` now adds `restrictedCollectionTypes` and swaps `props.collectionTypes` for it in the two places that use it. Before, this was a +26/-21 restructure that mixed re-indent with the `[]` behavior change.

## Not refactored

- `restrictedCollectionTypes` itself: at base, the two sites treat `[]` differently (`toDataOption` accepts any collection, `canAcceptSrc` refuses all). Unifying them is the fix, so it stays in the fix commit.
- DCE `collectionType` via `getElementAttributes` in `toDataOption`: this changes behavior, so it stays in the fix commit (unchanged from round 1).

## Verification

- `622d604a43e` (baseline): vitest Form + Workflow 55 files / 323 tests pass.
- `8dcf21ccad0` (refactor): 323 pass. Prettier is clean, eslint has 0 errors (2 pre-existing warnings), and `vue-tsc --noEmit` is clean.
- `07e9cc7a177`: 337 pass.
- HEAD `f6ff31f7187`: 338 pass. Prettier and eslint are clean (same 2 warnings), and `vue-tsc` is clean.
- No Python changes in this pass, so the API test was not re-run.
