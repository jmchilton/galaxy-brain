# Codex review: upload_datatypes_composable

I ran an independent Codex review (`codex exec -s read-only`) on `24c5e0c6530..77601207bd6`, which excludes the #23995 cherry-picks. Its brief contained only the branch goal. It reported 2 findings. I confirmed both in the code, a subagent wrote a failing test for each, and both are fixed in `0e3f2eae9e7` and `f02ec72f6ba`. The defect 2 fix introduced a regression: `ready` could go true before Galaxy config loaded, so items would get `auto`/`?` instead of the configured defaults. That was caught red-first and fixed in `962f6092f11`. Afterwards: vitest 117 files / 967 tests pass, `vue-tsc` is clean, and prettier, eslint and pre-commit are clean. No security findings.

Acted on:
- **P1 `DirectoryDatasetPicker.vue`: datatype load failures were still hidden.** `useDetailedDatatypes` only logged errors, so on a `/api/datatypes` 500 the Extension selector offered only `auto` and showed no error. It now returns an `error` ref, and the picker shows an inline `GAlert` instead of the selector. Test red: the alert text was missing.
- **P2 `uploadConfigurations.ts`: the private dbkey loader missed store recovery.** If `/api/genomes` failed at init, the upload configuration stayed empty and never became `ready`, even after another consumer loaded `dbKeyStore`. It now uses `useUploadDbKeys()`. The `default_genome` ordering comes from a computed sorted copy using the newly exported `dbKeySort`. `ready` now also requires `isConfigLoaded`. Tests red: "becomes ready when genomes load after an initial failure", and "is not ready before the Galaxy configuration loads" (the regression).

Not acted on: nothing from Codex. One cosmetic leftover: `dbKeySort` is now exported but still sits under `utils.js`'s "Local helper utilities." comment.

<details>
<summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "client/src/components/Collections/common/CollectionEditView.test.ts",
      "client/src/components/Collections/common/CollectionEditView.vue",
      "client/src/components/Help/HelpText.test.ts",
      "client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.test.js",
      "client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue",
      "client/src/components/Libraries/LibraryFolder/LibraryFolderDataset/LibraryDataset.test.js",
      "client/src/components/Libraries/LibraryFolder/LibraryFolderDataset/LibraryDataset.vue",
      "client/src/components/Libraries/LibraryFolder/TopToolbar/DirectoryDatasetPicker.test.ts",
      "client/src/components/Libraries/LibraryFolder/TopToolbar/DirectoryDatasetPicker.vue",
      "client/src/components/Panels/Upload/methods/CompositeFileUpload.vue",
      "client/src/components/Panels/Upload/methods/CompositeSlotRow.vue",
      "client/src/components/Panels/Upload/shared/UploadTableBulkDbKeyHeader.vue",
      "client/src/components/Panels/Upload/shared/UploadTableBulkExtensionHeader.vue",
      "client/src/components/Panels/Upload/shared/UploadTableDbKeyCell.vue",
      "client/src/components/Panels/Upload/shared/UploadTableExtensionCell.vue",
      "client/src/components/providers/storeProviders.js",
      "client/src/components/providers/storeProviders.test.js",
      "client/src/components/SingleItemSelector.vue",
      "client/src/components/Upload/utils.js",
      "client/src/components/Upload/utils.test.ts",
      "client/src/components/BaseComponents/GAlert.vue",
      "client/src/components/BaseComponents/GTab.vue",
      "client/src/components/BaseComponents/GTabs.vue",
      "client/src/components/Landing/gridHelpers.ts",
      "client/src/composables/datatypes.test.ts",
      "client/src/composables/datatypes.ts",
      "client/src/composables/dbKeys.test.ts",
      "client/src/composables/dbKeys.ts",
      "client/src/composables/upload/bulkUploadOperations.ts",
      "client/src/composables/upload/uploadDefaults.ts",
      "client/src/composables/uploadConfigurations.ts",
      "client/src/composables/uploadConfigurations.test.ts",
      "client/src/composables/config.ts",
      "client/src/stores/datatypeStore.js",
      "client/src/stores/datatypeStore.test.ts",
      "client/src/stores/dbKeyStore.js",
      "client/src/stores/helpTermsStore.test.ts",
      "client/src/stores/helpTermsStore.ts",
      "client/src/stores/datatypesMapperStore.ts",
      "client/src/stores/configurationStore.ts",
      "client/src/api/dbKeys.ts",
      "client/src/utils/sharedPromise.ts",
      "client/src/utils/simple-error.ts",
      "client/package.json",
      "client/vitest.config.ts",
      "client/tests/vitest/helpers.js"
    ],
    "notes": ""
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "client/src/components/Libraries/LibraryFolder/TopToolbar/DirectoryDatasetPicker.vue",
      "line": 60,
      "title": "The directory picker still hides datatype load failures",
      "detail": "The migration exposes dbkey errors but leaves the Extension selector on useDetailedDatatypes(), which catches failures without returning error state. When loading ends, fetchExtensions() treats the empty result as success and adds autoExtension. This leaves the intended datatype failure handling incomplete. A temporary test probe confirmed the auto-only selector and absence of an error message.",
      "failure_scenario": "Open the directory picker with /api/genomes succeeding and /api/datatypes returning HTTP 500 with err_msg='unavailable'. The Extension selector offers only 'auto', and the UI shows no datatype load error.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "reuse",
      "file": "client/src/composables/uploadConfigurations.ts",
      "line": 74,
      "title": "Upload configuration's separate dbkey loader misses shared-store recovery",
      "detail": "Unlike datatypes, dbkeys still use local listDbKeys/dbKeysSet refs and loadDbKeys(), duplicating loading behavior now covered by useUploadDbKeys(). These refs only update when config changes, so a successful retry through dbKeyStore does not repair an existing upload configuration. Consume the shared composable and derive the configured default ordering separately. A temporary test probe confirmed the stale empty list and false ready state after store recovery.",
      "failure_scenario": "Initialize an upload configuration while /api/genomes fails, leaving listDbKeys empty and ready=false. Restore the endpoint and mount another dbkey consumer, which successfully loads dbKeyStore. With config unchanged, the original upload configuration stays empty and unready, leaving its upload selectors disabled.",
      "confidence": "certain"
    }
  ]
}
```

</details>
