# Test challenges — ag_grid_36 (re-scope)

2026-10-22. Fresh pass over `origin/dev...HEAD` after the re-scope. Dropped three unit tests now duplicated by E2E; kept the rest. Commit `94884e50f3c`.

## Dropped

- `PairedOrUnpairedListCollectionCreator.test.ts`: "keeps an identifier the user edits in the grid" and "keeps a swap the user makes in the grid", with their helpers (`gridCopyOfRow`, `gridColumn`, `createdElementIdentifiers`). The extended `test_build_paired_list_auto_matched` covers both write-backs end to end. The unit tests also reached into `$attrs.columnDefs`, `context.onSwap` and `vm.attemptCreate`. The file now matches `origin/dev`.
- `FetchGrid.test.ts`: "builds its request from the rows as edited in the grid". `test_data_landing.py` covers it with the real grid, and the unit test called `vm.asTarget()` directly.

## Kept

- `useSampleSheetGrid.test.ts` real-`AgGridVue` test: the only check of the 36 row-copy contract for `MODEL_OBJECT`. It is red with the old `Symbol` key. `test_collection_sheet.py::test_view_sample_sheet` covers display only, not edit write-back.
- `SampleSheetGrid.test.ts` `gridCopies` changes: these adapt existing tests to grid copies, so no new tests were added.
- `FetchGrid.test.ts` stub accepts `modelValue`: the remaining tests need it because FetchGrid now binds `v-model`.

## E2E

The coverage is adequate: `test_data_landing.py` covers FetchGrid edits, and `test_build_paired_list_auto_matched` covers rename and swap. The re-scope debrief records red-with-fix-reverted evidence for each one. No API tests changed.

## Evidence

- vitest `src/components/Collections src/components/Landing`: 159/159 passed after the drops.
- eslint: 0 errors. vue-tsc: clean.
