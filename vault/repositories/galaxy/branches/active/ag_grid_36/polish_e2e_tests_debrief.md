# Polish E2E tests — ag_grid_36

Scoped the `data_landing` grid and success selectors to `data-description` hooks, and made the import wait use the job-completion timeout. Both branch E2E tests pass under Playwright. Commit `f1c68b9464c`.

## Changes

- `FetchGrid.vue` table wrapper gets `data-description="fetch grid"`, and the `data_landing.cell` and `cell_input` selectors are scoped under it. Before, they were unscoped `[aria-rowindex]` selectors, identical to `list_wizard`'s.
- `FetchLanding.vue` success alert gets `data-description="fetch landing success"`. `data_landing.success` used the generic `.alert-success`.
- `test_data_landing.py` now waits for the success alert with `wait_type=JOB_COMPLETION`. The alert appears only after the fetch job finishes, and the default wait timed out locally.

## Checked, no change

- The tests use no raw CSS selectors. Cell editing goes through the shared `ag_grid_edit_cell` helper, and the landing URL through `go_to_tool_landing`.
- The changed tests have no sleeps. The `sleep_for(UX_RENDER)` calls in `test_collection_builders.py` are in other tests outside this branch.
- Screenshots are captured: `data_landing_fetch_grid_edited` and `collection_builder_paired_list`.

## Evidence

Runs used Playwright, headless, against Galaxy on 8097 and Vite on 5191, one test at a time:

- `test_data_landing.py`: passed.
- `test_collection_builders.py::test_build_paired_list_auto_matched`: passed.

Not run: Selenium backend after this polish. The changes are selector and wait only.
