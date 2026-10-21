# Codex review

Acted on the one finding, a regression this branch introduced in an existing test; nothing left unaddressed. Fixed in "Test converting a collection's datatype from its edit view", head `0ad5bc85a60`.

## Acted on

- **`test_change_dbkey_simple_list` re-opened the wrong collection (CONFIRMED).** The old `collection_menu_edit_attributes` clicked the panel's first `.edit-btn`, so the second `open_collection_edit_view()` opened the newest item, the dbkey copy at hid 5. Hard-coding hid 3 made it reopen the unchanged original. The test could then pass on `DatabaseEditTab`'s leftover `hg17` selection even if the copy ignored the dbkey. Now `open_collection_edit_view(hid=3)` takes a hid and the verification opens 5. The test passes under Playwright and Selenium.

## Not acted on

None.

<details>
<summary>Codex output (codex exec, read-only, scope origin/release_26.2...HEAD at 5ff72b94a2a)</summary>

- P1 test-coverage, `test_collection_edit.py:95`, "Open the copied collection when verifying its changed database/build". Database/build changes apply to copied datasets, leaving HID 3 unchanged. Clicking HID 3 again pushes the current route, so DatabaseEditTab can retain its locally selected hg17 value. Failure scenario: the copy is created at HID 5 but ignores the dbkey, and the final assertion still passes. Confidence: certain.

Coverage: all changed files, plus the collection builder/edit Vue components, the dataset_collections API/service and `fasta_to_tabular_converter.py`. E2E tests were not executed by Codex.

</details>
