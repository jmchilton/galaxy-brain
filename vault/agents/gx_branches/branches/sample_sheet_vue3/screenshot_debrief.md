Screenshots successfully obtained.

# sample_sheet_vue3 — screenshots

Recorded 2026-10-08 under Playwright (headless) from branch head `5b921635fb2`. This worktree's Galaxy ran on 8081 using `pick_value_module`'s venv, with an untracked `config/galaxy.yml` that was removed afterward. Vite ran on 5174 with `GALAXY_URL=http://127.0.0.1:8081`, and `GALAXY_TEST_SCREENSHOTS_DIRECTORY` was set. Each test ran alone with fresh users and passed. The files are in `screenshots/`, which git ignores.

| File | Test | Shows |
| --- | --- | --- |
| `collection_sheet_view.png` | `test_collection_sheet.py::test_view_sample_sheet` (new) | "View Sheet" grid for an API-built sample sheet: Identifier / replicate / treatment, 2 rows |
| `collection_sheet_load_error.png` | `test_view_sample_sheet_load_error` (new; screenshot added in `5b921635fb2`) | Bad id shows the error alert ("Wrong id … unable to decode"), not a spinner. On `dev` this page spins forever |
| `workflow_run_sample_sheet_chipseq_source.png` | `test_workflow_run.py::test_collection_input_sample_sheet_chipseq_example_from_uris` | Wizard source step |
| `workflow_run_sample_sheet_chipseq_pasted_data.png` | same | Pasted URIs |
| `workflow_run_sample_sheet_chipseq_table_empty.png` | same | Fill-sheet grid before entry (URIs plus identifiers; the stepper is mid-transition) |
| `workflow_run_sample_sheet_chipseq_table_full.png` | same | Filled `SampleSheetGrid`: condition, replicate and Control (`element_identifier`) columns for 8 rows |
| `workflow_run_sample_sheet_chipseq_sheet_created.png` | same | "Sample sheet collection successfully created!" with the input selected |
| `workflow_run_sample_sheet_from_collection.png` | `test_collection_input_sample_sheet_chipseq_example_from_list_pairs` | Wizard after choosing the collection source |
| `workflow_run_sample_sheet_from_collection_select_collection.png` | same | Collection picker |
| `workflow_run_sample_sheet_from_collection_grid.png` | same | Fill-sheet grid seeded from the existing list:paired |
| `workflow_run_sample_sheet_from_collection_grid_full.png` | same | Filled grid with immutable identifiers |

## Notes

- **Test change:** only one line, `self.screenshot("collection_sheet_load_error")`, at the end of `test_view_sample_sheet_load_error`. It is in `5b921635fb2`, pushed fast-forward to `jmchilton/sample_sheet_vue3`. pre-commit (black, ruff, flake8) passes.
- **No screenshot of the duplicate-identifier toast.** No E2E renames identifiers. Adding a rename-to-duplicate flow just for a screenshot would bend the chipseq tests. The unit test `SampleSheetGrid.test.ts` covers the toast.
- **`table_empty` shows the stepper mid-animation.** This is cosmetic, comes from the existing test, and was left alone.
- **Shutdown gotcha:** `run.sh stop` without `GALAXY_SKIP_CLIENT_BUILD=1` started a production client build and hung. That build and the Galaxy, celery and Vite processes were stopped by PID. Ports 8081 and 5174 are free. The 8080 server was not touched.
