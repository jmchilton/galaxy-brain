# Codex review: sample_sheet_vue3

Recovery run. An independent Codex review (`codex exec -s read-only`) ran on `02a2e659909..a0a45ce7795` (the branch commit plus the test-challenge commit). Its brief held only the branch goals. It returned 2 findings. I confirmed both and fixed them, each red first. There were no security findings.

Acted on:
- **P2 `parseSampleSheetValue` accepted special characters in `element_identifier` cells.**
  - The backend's `validate_column_value` runs `validate_no_special_characters` (`[\w\-_ ?]`) on element references.
  - The branch dropped that check, which `dev` had through the default string case, so `sample.1` was accepted in the grid and then rejected on create.
  - The "identifiers containing `.` are accepted" behaviour change in the earlier debrief and PR description was a regression, not a feature.
  - Fix (`c215573d915`): `element_identifier` falls through to the string check again.
  - Test: the parser table row moved from "accepts `sample.1`" to "rejects `sample.1`" (red: `{valid: true}`), and the accept row is now `sample 1`.
- **P2 FetchGrid shows stale rows after the second target replacement.**
  - The fixed watcher now fires, but `initializeTabularVersionOfTarget` spliced and refilled the same array.
  - ag-grid-vue3 marks that array raw, so after one replacement the grid stopped seeing refills.
  - Fix (`29fce0cf9e5`): assign a fresh array. This removes the `initializeRowData` helper.
  - New `FetchGrid.test.ts` mounts the real ag-grid with nothing stubbed. Targets a and b rendered and c did not (red); with the fix it is green.
  - On `dev` the watcher never fired, so a replaced target was never shown at all. This was a partial fix on the branch, not a regression.

Validation: vitest across Landing, Collections and RuleBuilder passes 152/152 on node 22.20.0. vue-tsc is clean, and eslint and prettier are clean apart from the existing hyphenation warnings. Pushed to `jmchilton sample_sheet_vue3` at `29fce0cf9e5`. E2E was not re-run, because neither change touches a path the E2E tests drive differently.

Not acted on: none.

<details>
<summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue",
      "client/src/components/Collections/PairedOrUnpairedListCollectionCreator.test.ts",
      "client/src/components/Collections/PairedOrUnpairedComponents.ts",
      "client/src/components/Collections/SampleSheetWizard.vue",
      "client/src/components/Collections/common/DisplayCollectionAsSheet.vue",
      "client/src/components/Collections/common/CellDiscardComponent.vue",
      "client/src/components/Collections/common/CellStatusComponent.vue",
      "client/src/components/Collections/common/PairedDatasetCellComponent.vue",
      "client/src/components/Collections/common/useCollectionCreation.ts",
      "client/src/components/Collections/sheet/SampleSheetGrid.vue",
      "client/src/components/Collections/sheet/SampleSheetGrid.test.ts",
      "client/src/components/Collections/sheet/useSampleSheetGrid.ts",
      "client/src/components/Collections/sheet/useSampleSheetGrid.test.ts",
      "client/src/components/Collections/sheet/workbooks.ts",
      "client/src/components/Collections/wizard/types.ts",
      "client/src/components/Landing/FetchGrid.vue",
      "client/src/components/Landing/FetchGrids.vue",
      "client/src/components/Landing/FetchLanding.vue",
      "client/src/components/Landing/ToolLanding.vue",
      "client/src/components/Landing/fetchModels.ts",
      "client/src/components/Landing/gridHelpers.ts",
      "client/src/components/RuleBuilder/RuleGrid.vue",
      "client/src/components/LoadingSpan.vue",
      "client/src/composables/useAgGrid.ts",
      "client/src/composables/datasetCollections.ts",
      "client/src/stores/datasetCollectionStore.ts",
      "client/src/api/datasetCollections.ts",
      "client/src/entry/analysis/router.js",
      "client/src/utils/navigation/navigation.yml",
      "client/vitest.config.ts",
      "client/node_modules/ag-grid-vue3/dist/package/main.esm.mjs",
      "client/node_modules/ag-grid-community/dist/package/main.esm.mjs",
      "client/node_modules/@vue/compat/dist/vue.esm-bundler.js",
      "lib/galaxy/model/dataset_collections/types/sample_sheet.py",
      "lib/galaxy/model/dataset_collections/types/sample_sheet_util.py",
      "lib/galaxy/model/dataset_collections/types/sample_sheet_workbook.py",
      "lib/galaxy/selenium/navigates_galaxy.py",
      "lib/galaxy/selenium/smart_components.py",
      "lib/galaxy_test/base/populators.py",
      "lib/galaxy_test/selenium/test_collection_sheet.py"
    ],
    "notes": "All changed files reviewed. Focused Vitest suites passed (36 tests); real ag-grid integration probes verified model updates and reproduced repeated FetchGrid reload failure. Selenium tests inspected but not executed."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "client/src/components/Landing/FetchGrid.vue",
      "line": 162,
      "title": "Repeated target replacements leave FetchGrid displaying stale rows",
      "detail": "The corrected watcher still calls initialization that splices and repopulates the same gridRowData array (lines 124–125). ag-grid-vue3 marks the initial row-data array raw. After its deep watcher processes the first replacement, Vue stops traversing that marked array, so subsequent mutations no longer update the grid. A probe using the actual useAgGrid wrapper reproduced this despite replacing column definitions on every reload. Assign a fresh row array during initialization.",
      "failure_scenario": "Mount with a target containing URL A, replace target with URL B, then replace it with URL C. The grid continues displaying B while gridRowData and asTarget() contain C. Editing the visible B row edits an obsolete object, so the submitted request does not reflect that edit.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "api-contract",
      "file": "client/src/components/Collections/sheet/useSampleSheetGrid.ts",
      "line": 83,
      "title": "Element-reference parsing accepts characters the creation API rejects",
      "detail": "The new element_identifier branch unconditionally accepts text, removing the previous character validation. The unchanged backend validate_column_value() calls validate_no_special_characters() for element references, rejecting periods and slashes even when the referenced identifier exists. The new parser test explicitly accepts sample.1, which violates that server contract.",
      "failure_scenario": "Create rows named sample.1 and control with an element_identifier metadata column. Select sample.1 as control's reference: the grid accepts and stores it, but creating the collection fails with \"Column value 'sample.1' contains special characters that are not allowed.\"",
      "confidence": "certain"
    }
  ]
}
```

</details>
