# Codex review — ag_grid_36

2026-10-22. `codex exec -s read-only`, scope `origin/dev...HEAD` at `8b45bce1a29`. Codex checked every ag-grid usage in `client/src` and tested row copying against the installed v36 grid under happy-dom.

## Confirmed

- **P1: sample-sheet rows lose their source element.** ag-grid-vue3 36 deep-copies plain-object rows with `Object.keys` (`R()` in `ag-grid-vue3/dist/main.umd.js`), so the `[MODEL_OBJECT]` symbol key is dropped. Readers: `useSampleSheetGrid.ts` (`modelObjectIdentifierColumn`), `SampleSheetGrid.vue` (`elementIdentifierFromRow`, `elementsForCreateApi`), `DisplayCollectionAsSheet.vue`. Viewing an existing sample sheet throws in the identifier getter. Creating one from existing datasets after an edit fails with "Expected a dataset row" (or "Expected a collection row" for pairs). The existing tests mock `AgGridVue`, so they never see the copy. **Fixed in `028805e550e`.** `MODEL_OBJECT` is now the string key `"@model_object"`. `@` can't appear in a column name: both the server (`has_special_characters`) and the client (`parseSampleSheetValue`) allow only `^[\w\-_ ?]*$`. A new real-`AgGridVue` test in `useSampleSheetGrid.test.ts` failed before the fix (`Cannot read properties of undefined (reading 'element_identifier')`) and passes after it. To make that test run, `ag-grid-vue3` was added to the vitest inline deps list. A follow-up commit, `2d0ba60c9eb`, fixed the vue-tsc errors from the test-challenge stub.

## Refuted / needs decision

None.
