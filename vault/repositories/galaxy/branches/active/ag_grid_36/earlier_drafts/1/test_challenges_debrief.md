# ag_grid_36 — test challenges debrief

2026-10-22, on `d310c6fe2da` (rebased onto `origin/dev` after #24050).

## Tests challenged

- **`FetchGrid.test.ts`, rebase merge.** Dev's two tests (unsupported-target drop, fresh row array per target) were switched to a `modelValue`-only stub. Problem: on dev's `:row-data` binding the stub got no rows, so the branch's edit test failed on the fixture (crash on `rows[0]`), not at its assertion. Changed: the stub takes `modelValue` or `rowData` (no defaults, so `not.toBe` identity checks can't pass on fresh default arrays), and a `gridRows()` helper reads whichever is bound. Kept all three tests.
  - Red check (dev's `FetchGrid.vue`): the two dev tests pass; the edit test fails at `expected 'http://example.com/file1.txt' to be 'http://example.com/renamed.txt'`.
- **`PairedOrUnpairedListCollectionCreator.test.ts`, identifier edit and swap.** Kept. They drive the column's `onCellValueChanged` and `context.onSwap` with JSON copies of rows, which models 36's row copying; they assert on the created payload, not internals.
  - Red check (write-back removed from `onIdentifierChange`/`onSwap`): fails at `expected 'sample' to be 'renamed'` and `expected [ 'a', 'b' ] to deeply equal [ 'b', 'a' ]`.
- **`SampleSheetGrid.test.ts`.** Only the fixture changed (`toRaw` rows → JSON copies) to match 36. No new tests. Kept.
- No layout faking, no dedicated infra-fix test files, no API/integration tests in the branch.

## E2E

- Paired builder, sample sheet and rule builder already have E2E coverage, and it passed on the upgrade (see implementation debrief).
- **Gap, not built:** `FetchGrid` (data landing grid) has no E2E. Edits there are covered only by the vitest above. Recommend a Selenium/Playwright test that opens a data landing, edits a URL cell and checks the submitted request. It needs new landing fixtures and grid-editing helpers, so it's left as a follow-up.

## Results

- vitest `FetchGrid`, `PairedOrUnpairedListCollectionCreator`, `SampleSheetGrid`: 34/34 pass.

## Commits

- `8b45bce1a29` FetchGrid test stub accepts rowData or modelValue. eslint shows 2 `vue/require-default-prop` warnings on the stub; they're intentional, since `[]` defaults would make the `not.toBe` checks pass trivially.

Status: not blocked.
