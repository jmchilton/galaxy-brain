Fix sample sheet grid editing: workbook reloads, duplicate identifier checks, boolean edits and stale identifier dropdowns.

On `dev`, filling a sample sheet (for example a sample sheet input on the workflow run form) breaks in several ways:

| When the user… | `dev` | This PR |
| --- | --- | --- |
| drops a workbook on the fill-grid step | grid keeps the old rows 😬 | grid reloads from the workbook ✅ |
| types an element identifier another row already uses | accepted 😬 | rejected with a "must be unique" toast ✅ |
| edits a boolean column | editor throws (`value.toLowerCase is not a function`) 😬 | value saved ✅ |
| clears a required int column | stores `NaN` 😬 | edit rejected ✅ |
| renames identifiers, then opens an `element_identifier` dropdown | old names offered 😬 | current names offered ✅ |
| views a collection as a sheet and the load fails | spinner forever 😬 | error shown ✅ |

***The Vue 3 reshape is the fix, not a refactor riding along. Most of these bugs are Vue 2 patterns that silently do nothing under Vue 3.*** The workbook watcher was `watch(() => { props.initialElements; }, …)`, a getter that returns `undefined` and so never fires. ag-grid-vue3 hands the grid raw rows, so edits never reached the computeds that build the dropdown choices. The duplicate check compared `node.data.element_identifier`, a field the grid never sets. ag-grid infers a checkbox editor for boolean values and passes booleans to a string validator.

The grids now use ordinary Vue 3 patterns, and each bug got a red test first:

```diff
 <SampleSheetGrid>
-  rowData = ref([]); initialize() fills it in place
-  watch(() => { props.initialElements; }, initialize)   // never fires
-  <AgGridVue :row-data="rowData" />                      // edits bypass Vue
+  { rowData } = useSampleSheetGrid(() => buildRows(props.initialElements, …))
+  <AgGridVue v-model="rowData" />                        // edits replace rowData
   valueSetter
-    hand-rolled per-type validation, duplicate check on wrong field
+    parseSampleSheetValue(value, columnDefinition)       // pure, typed, table-tested
+    enforceColumnUniqueness (Landing/gridHelpers.ts)
```

***This is not an ag-grid upgrade. It runs on the 31.3.4 that 🔀 #23938 brought in; the 36.x upgrade is a separate, optional branch stacked on this one.***

***The create and fetch payloads are unchanged. The four payload tests (sample sheet, paired with workbook `type_index` hashes, unpaired `paired_or_unpaired`, from an existing collection) pass against both the old and the new component.***

***The shared `useAgGrid` wrapper now runs ag-grid in Vue 3 compat mode, so the change reaches all five ag-grid users. The list builder and rule builder E2E tests pass with it.***

<details><summary>Vue 3 shape and shared code</summary>

- `useSampleSheetGrid(buildRows)` rebuilds rows from a watched source. `SampleSheetGrid` and `DisplayCollectionAsSheet` both bind it, and `SampleSheetGrid` uses `v-model` so edits flow back.
- `parseSampleSheetValue` is a pure parser returning `{ valid, value }`. It accepts the strings that text and select editors produce and the numbers and booleans that ag-grid's inferred editors produce.
- Shared column builders: `modelObjectIdentifierColumn`, `toAgGridColumnDefinition`. `extraColumns`, `isPaired` and similar are computeds, and payloads are built by per-row helpers instead of duplicated loops.
- `useAgGrid` holds one module-level async `AgGridVue` and defaults `resize` to `sizeColumnsToFit`, which removes four copies of the same `resize()`.
- `FetchGrid`'s `target` watcher had the same never-fires getter and is fixed too.
- Drive-bys: an undeclared `height="300px"` attribute on `SampleSheetGrid` in `SampleSheetWizard.vue`, and a double slash in an import path.

</details>

<details><summary>Why <code>AgGridVue</code> opts into compat <code>MODE: 3</code></summary>

The client runs `@vue/compat` with global `MODE: 2`, which rewrites a component's `v-model` to `value`/`input`. ag-grid-vue3 expects `modelValue`/`update:modelValue`, so `v-model` silently does nothing. Compat decides per vnode from that vnode's own component, so the opt-in, `compatConfig: { MODE: 3 }`, goes on the `defineAsyncComponent` wrapper that the parent's `v-model` targets. Remove it and the `SampleSheetGrid` editing tests go red. The inner `AgGridVue` opts in too, so it receives only the Vue 3 props instead of the legacy `value`/`input` pair as well. This follows the `SortableList.ts` precedent.

It applies to all five grids that use `useAgGrid` (sample sheet, display-as-sheet, `FetchGrid`, the paired/unpaired list builder and the rule builder). The wrapper deep-watches all its props, so array watch behaviour doesn't change. The list builder, rule builder and sample sheet E2E tests cover the other grids.

</details>

<details><summary>Smaller behaviour changes</summary>

- Float cells are parsed with `Number`, not `parseFloat`, so `"1abc"` is rejected instead of saved as `1`.
- Clearing an optional float or boolean cell stores `null`. It used to be rejected.
- Restrictions compare as text, so when the editor hands over a string (an optional restricted int column starts empty and gets a text editor), the allowed values are accepted.
- `element_identifier` values skip the `[\w\- ?]` string check, so identifiers containing `.` can be chosen. The select limits the choices anyway.
- A rejected edit reverts the cell without a message, as on `dev`. Stricter float parsing means this happens for more inputs.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Review Advice</summary>

The change is client-only and payloads are unchanged. Look at the compat `MODE: 3` opt-in in `useAgGrid.ts`, since it reaches all five ag-grid users (unit tests cover it for the sample sheet grid, E2E covers the others), and at the small parser behaviour changes above.

</details>

## Context

Builds on 🔀 #23938 (ag-grid 31.3.4). Touches one line that 🔀 #23922 also removes (`height="300px"` in `SampleSheetWizard.vue`).

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A duplicate identifier shows a toast and a load error shows the error alert. Other rejected edits revert the cell silently, as before.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The grid tests drive the real component through `useAgGrid`'s async wrapper with only `ag-grid-vue3` stubbed, and the payload tests also pass on the old component.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The change is client-only and the payloads are unchanged.
- [x] Who hits this in practice and what is the evidence? Anyone filling a sample sheet, including on the workflow run form. Each bug was reproduced as a failing test first; no user report is linked.
- [x] Were simpler or existing approaches considered? Yes. It reuses `enforceColumnUniqueness` from `Landing/gridHelpers.ts` and the `SortableList.ts` compat precedent. Validating `file_type`/`dbkey` extra columns with `useGridHelpers`, as `FetchGrid` does, is left for a follow-up.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- New `SampleSheetGrid.test.ts`: each bug above as a red-then-green test, plus four create-payload tests that also pass on the pre-change component.
- New `useSampleSheetGrid.test.ts`: input/output tables for `parseSampleSheetValue`.
- New `DisplayCollectionAsSheet.test.ts`: a load error renders the error instead of the spinner.
- The `SampleSheetGrid` tests mock `ag-grid-vue3`, not `useAgGrid`, so they go through the real async wrapper and its compat opt-in. `DisplayCollectionAsSheet.test.ts` mocks `useAgGrid`, since it only checks the error branch.
- Clearing a required int is tested with both `""` (text editor) and `null` (the number editor ag-grid infers from the starting `0`). On `dev` both stored `NaN`.
- Passing locally under Playwright on ag-grid 31.3.4: both `test_collection_input_sample_sheet_chipseq_example_*`, `test_build_paired_list_manual_matched`, `test_build_list_of_lists` and `test_rules_example_3_list_pairs`. `test_build_paired_unpaired_list` also passed before the move to 31.3.4.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
