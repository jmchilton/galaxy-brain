Add missing tests for tool form accepted formats and interval column metadata

Missing browser tests for two 26.2 UI paths:

| Behavior | Before | After |
|---|---|---|
| Tool form data field "accepted formats" toggle lists datatypes | no test | `test_tool_form.py::test_data_parameter_accepted_formats` (`column_param` input1 → csv, tabular) |
| Attributes tab: assign interval chrom/start/end/name columns and Save | no test | `test_dataset.py::test_history_dataset_assign_interval_columns` (checks defaults, then API values and reopened form) |

Needed for the tests:
- `data-description` hooks on the accepted formats button and list items (`FormDataExtensions.vue`)
- `tool_form` and `edit_dataset_attributes` selectors in `navigation.yml`
- `tool_form_accepted_formats`, `edit_dataset_attribute_fields` and `edit_dataset_set_metadata_select` in `NavigatesGalaxy`

Both tests pass locally under Selenium and Playwright.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
