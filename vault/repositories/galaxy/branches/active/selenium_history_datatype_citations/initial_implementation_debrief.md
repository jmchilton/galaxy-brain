# Initial implementation debrief

Cherry-picked "Test changing the data type of selected history items" and "Test exporting a history's tool references" from `galaxy_ui_driver` (`a51d2b9ed4a`, `93b1f03b432`) onto `origin/release_26.2` `e2649e52818`, as one branch per John's request. Head `adea322053b`.

## Conflict

`navigation.yml`: the citations hunk was anchored on the `dataset_error`/`email_report` blocks, which come from the error-report FAQ commit and aren't on 26.2. Kept only `citations:`, now placed after `dataset_details`.

## Review changes (folded into each commit)

See [normal review](subagents/normal_review.md).
- `history_panel_change_datatype_of_selected` now goes through the existing `select_set_value`. It used to click `[data-id=…]` after typing, which vue-multiselect's index-keyed options can race under Selenium. Three selectors dropped.
- The citations test takes expected values from the APIs. It asserts count = `histories/{id}/citations` + 1, Galaxy's citation first (its BibTeX key parsed from `configuration.citation_bibtex`), and the tool's after. It also switches back to APA, so `apa_tab` is used. It no longer hard-codes `Galaxy2026` or the NAR title.
- New `NavigatesGalaxy.history_panel_wait_for_hid_datatype`. It replaces the test's private helper and the inline wait in `test_collection_edit.py::test_change_datatype_simple_list`.

## Celery

Change data type only shows with Celery. Every selenium test class gets `UsesCeleryTasks` through `TestWithSeleniumMixin`, so no guard is needed and CI runs it.

## Verification

Both backends ran against a framework-managed server (no `GALAXY_TEST_EXTERNAL`, no end-to-end config, client built in place):
- Playwright and Selenium: `test_change_datatype_of_selected_items`, `test_history_options.py` (2/2) and `test_collection_edit.py::test_change_datatype_simple_list` all pass.
- `test_collection_edit.py::test_change_dbkey_simple_list` fails under both backends. It is untouched by this branch; the local test server has no `tool-data/shared/ucsc/builds.txt`.
- Red: I reverted all four Vue `data-description` hooks and rebuilt the client. Both new tests then fail on the missing selectors. I restored the hooks and rebuilt.
