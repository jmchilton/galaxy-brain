Fix sample sheet grid editing: workbook reloads, invalid-edit feedback, duplicate identifier checks, boolean edits and stale identifier dropdowns.

On `dev`, filling a sample sheet (for example a sample sheet input on the workflow run form) breaks in several ways:

| When the user… | `dev` | This PR |
| --- | --- | --- |
| drops a workbook on the fill-grid step | grid keeps the old rows 😬 | grid reloads from the workbook ✅ |
| types an element identifier another row already uses | accepted 😬 | rejected with a "must be unique" toast ✅ |
| edits a boolean column | editor throws (`value.toLowerCase is not a function`) 😬 | value saved ✅ |
| clears a required int column | stores `NaN` 😬 | edit rejected with a toast ✅ |
| enters an unknown workbook datatype or genome | accepted 😬 | rejected with a toast; blank cells still use upload defaults ✅ |
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

***The create and fetch payloads are unchanged. The original four payload tests (sample sheet, paired with workbook `type_index` hashes, unpaired `paired_or_unpaired`, from an existing collection) pass against both the old and the new component.***

***The shared `useAgGrid` wrapper now runs ag-grid in Vue 3 compat mode, so the change reaches all five ag-grid users. The list builder and rule builder E2E tests pass with it.***

<details><summary>Vue 3 shape and shared code</summary>

- `useSampleSheetGrid(buildRows)` rebuilds rows from a watched source. `SampleSheetGrid` and `DisplayCollectionAsSheet` both bind it, and `SampleSheetGrid` uses `v-model` so edits flow back.
- `parseSampleSheetValue` is a pure parser returning `{ valid, value }`. It accepts the strings that text and select editors produce and the numbers and booleans that ag-grid's inferred editors produce.
- `AgRowData` is a `UriRow | ModelObjectRow` union, so identifier and payload helpers narrow the row before reading its source fields. The workbook API’s open-ended row schema is asserted at the input boundary.
- Workbook `file_type` and `dbkey` columns reuse `useGridHelpers` with the grid’s existing upload configuration. Unknown edits show the shared validation toast, and blank cells retain the upload-default fallback.
- Shared column builders: `modelObjectIdentifierColumn`, `toAgGridColumnDefinition`. `extraColumns`, `isPaired` and similar are computeds, and payloads are built by per-row helpers instead of duplicated loops.
- `useAgGrid` holds one module-level async `AgGridVue` and defaults `resize` to `sizeColumnsToFit`, which removes four copies of the same `resize()`.
- `FetchGrid`'s `target` watcher had the same never-fires getter and is fixed too. Each new target now gets a fresh row array, because ag-grid-vue3 marks the bound array raw and in-place refills stop reaching the grid.
- Drive-bys: an undeclared `height="300px"` attribute on `SampleSheetGrid` in `SampleSheetWizard.vue`, and a double slash in an import path.

</details>

<details><summary>Why <code>AgGridVue</code> opts into compat <code>MODE: 3</code></summary>

The client runs `@vue/compat` with global `MODE: 2`, which rewrites a component's `v-model` to `value`/`input`. ag-grid-vue3 expects `modelValue`/`update:modelValue`, so `v-model` silently does nothing. Compat decides per vnode from that vnode's own component, so the opt-in, `compatConfig: { MODE: 3 }`, goes on the `defineAsyncComponent` wrapper that the parent's `v-model` targets. Remove it and the `SampleSheetGrid` editing tests go red. The inner `AgGridVue` opts in too, so it receives only the Vue 3 props instead of the legacy `value`/`input` pair as well. This follows the `SortableList.ts` precedent.

It applies to all five grids that use `useAgGrid` (sample sheet, display-as-sheet, `FetchGrid`, the paired/unpaired list builder and the rule builder). The wrapper deep-watches all its props, so array watch behaviour doesn't change. The list builder, rule builder and sample sheet E2E tests cover the other grids, and `FetchGrid.test.ts` mounts `FetchGrid` with `ag-grid-vue3` stubbed to check target replacement and row-array identity.

</details>

<details><summary>Smaller behaviour changes</summary>

- Float cells are parsed with `Number`, not `parseFloat`, so `"1abc"` is rejected instead of saved as `1`.
- Clearing an optional float or boolean cell stores `null`. It used to be rejected.
- Restrictions compare as text, so when the editor hands over a string (an optional restricted int column starts empty and gets a text editor), the allowed values are accepted.
- A rejected metadata edit keeps the old value and shows a toast naming the column. This also explains rejections caused by stricter float parsing.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Review Advice</summary>

The change is client-only and payloads are unchanged. Look at the compat `MODE: 3` opt-in in `useAgGrid.ts`, since it reaches all five ag-grid users (unit tests cover it for the sample sheet grid, E2E covers the others), and at the small parser behaviour changes above.

</details>

## Context

Builds on 🔀 #23938 (ag-grid 31.3.4). Touches one line that 🔀 #23922 also removes (`height="300px"` in `SampleSheetWizard.vue`).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The Vue 3 grid fixes belong together; John approved the three small follow-ups.</summary>

The watched row source, compat opt-in and FetchGrid reload fix address the same Vue 3 grid behavior. John subsequently included rejected-edit feedback, workbook datatype/genome validation and the row union in this branch’s scope. The ag-grid 36 upgrade and FetchGrid E2E remain separate work.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Mock-heavy sheet-view coverage was replaced with browser tests.</summary>

Kept the parser tables, editing regressions and payload checks; collapsed a duplicate clearing case. Replaced the mocked sheet-view unit test with happy-path and load-error E2E tests, passing under Playwright and Selenium. Those browser runs predate the three follow-ups, which were verified with component tests. The new edit-feedback and extra-column assertions also fail on the pre-polish component and pass with the changes.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two confirmed findings were fixed with failing regression tests.</summary>

Restored the backend’s special-character rule for element references and gave FetchGrid a fresh row array on every target replacement. The FetchGrid regression mounts real ag-grid. These findings came from the earlier independent review; the follow-up polish received a fresh checklist review.

</details>

Review of the 11 existing screenshot captures covering the sheet view, load-error alert and both chipseq wizard paths found no blocking layout or rendering issues. One capture caught the stepper mid-animation; the edit toasts were not captured, and their behavior is covered by component tests.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Rejected metadata, duplicate identifier and unknown datatype/genome edits show a toast and keep the old value; a load error shows the error alert.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The grid tests drive the real component through `useAgGrid`'s async wrapper with only `ag-grid-vue3` stubbed, and the payload tests also pass on the old component.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Sample sheet workflow inputs gain corrected editing and validation; workflow execution and payload formats are unchanged.
- [x] Who hits this in practice and what is the evidence? Anyone filling a sample sheet, including on the workflow run form. Each bug was reproduced as a failing test first; no user report is linked.
- [x] Were simpler or existing approaches considered? Yes. It reuses `enforceColumnUniqueness`, the datatype/genome validators in `useGridHelpers`, and the `SortableList.ts` compat precedent.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- New `SampleSheetGrid.test.ts`: editing regressions, rejected-edit toasts and workbook datatype/genome validation, including blank-cell upload defaults. The original four create-payload tests also pass on the pre-change component; an additional payload test covers existing paired collections.
- New `useSampleSheetGrid.test.ts`: input/output tables for `parseSampleSheetValue`.
- New `FetchGrid.test.ts`: uses an `ag-grid-vue3` stub and the real `useAgGrid` async wrapper to check target replacement, a fresh `rowData` array for each supported target, and clearing stale state for unsupported targets. Reverting fresh-array assignment to an in-place splice fails the identity assertion. The original stale third-target behavior was reproduced against real ag-grid during the earlier review.
- New E2E `test_collection_sheet.py`: `test_view_sample_sheet` checks every cell of an API-created sample sheet in the "View Sheet" grid, and `test_view_sample_sheet_load_error` checks that a load error shows the error alert, not a spinner (it times out on `dev`'s branch order). Both pass under Playwright and Selenium.
- The `SampleSheetGrid` tests mock only `ag-grid-vue3`, not `useAgGrid`, so they go through the real async wrapper and its compat opt-in.
- Clearing a required int: the grid test uses `null`, the value the number editor (inferred from the starting `0`) hands over, and the parser table covers both `""` and `null`. On `dev` both stored `NaN`.
- Passing locally under Playwright on ag-grid 31.3.4: both `test_collection_input_sample_sheet_chipseq_example_*`, `test_build_paired_list_manual_matched`, `test_build_list_of_lists` and `test_rules_example_3_list_pairs`. `test_build_paired_unpaired_list` also passed before the move to 31.3.4.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
