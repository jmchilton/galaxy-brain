# CI diagnosis

## 2026-11-01, `38c2ac06b3c`

Three failed jobs; two related, fixed in `be0eec1ac9b`.

- **Related**: `Playwright tests / Test (3.10, 0)` and `Tool form harness tests / Test (3.10)`. `test_tool_form_fill_expands_only_collapsed_sections` and `test_tool_form_harness[gx_section_boolean_0]` time out waiting for a parameter in a collapsed section. The review round's `section_header_collapsed` scope `//div[h2="Tool Parameters"]` matched nothing, because `Heading separator` wraps the h2 in `div.separator`. The unit fixtures had a bare h2, so they missed it. Fix: scope to the h2's nearest ancestor div holding sections; fixtures now use the separator markup (red on both backends before the fix).
- **Related**: `test_rerun_dataset_collection_element` (same Playwright job) never saw batch info; the final DOM shows "Multiple datasets" pressed. The new shared `enter_collection_mode` checks `is_absent` right after `tool_open`, which returns before the form renders, so it skipped the click. Fix: wait for the data select first; new fixture test removes the field and re-adds it after 500 ms (red before the fix).
- **Unrelated**: `Unit tests / Test (3.14)`, `test_cached_tool.py::test_edited_tool_files_sees_edit_made_while_populating`. Not a changed area; the job failed in 1/3 recent dev runs. Rerun run 40540118449 (attempt 1) before the fix push; the new push supersedes it.
- CWL conformance and Pulsar package runs failed with no failed job (setup/skips).

Local: `test/unit/selenium/` 561 passed, 1 skipped; 3 `test_driver_factory` Selenium failures are local env only (no `chromedriver` on PATH).
