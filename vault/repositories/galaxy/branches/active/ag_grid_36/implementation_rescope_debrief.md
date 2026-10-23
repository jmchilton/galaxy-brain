# Re-scope debrief — ag_grid_36

2026-10-22. John approved the modest expansion from the scope evaluation (`earlier_drafts/1/scope_evaluation.md`). The original scope is kept as `ag_grid_36_alt_original_scope` (`9a28016a0e1`, see `alts/original_scope.md`).

## Added

- `1129d8b7c1b`: new `test_data_landing.py` E2E. It creates a data landing, edits the name and URL cells in FetchGrid, imports, and checks the imported dataset's name and content through the API. Adds a `go_to_tool_landing` navigation helper and `data_landing` selectors.
- `0e54f67dd4b`: `test_build_paired_list_auto_matched` now renames the pair and swaps forward/reverse, then checks the created HDCA.
- `4a48302888f`: comment in `useAgGrid.ts` describing the row-copy contract.

## Review fixes

- `809ef525e86`: dev validations showed an overlay (warning #9) that blocked FetchGrid clicks. The legacy CSS never sets `--ag-auto-height-max-body-height`, so the new `agGridLegacyTheme.css` sets it to `none`. Layout is unchanged and validations stay on. No other grid uses `autoHeight` or measures a variable the legacy CSS leaves undefined.
- `bcc3e1d5895`: replaced the duplicated `ag_grid_replace_cell_text` with a generic `ag_grid_edit_cell(..., clear=False)`. `list_wizard_click_cell_and_send_keys` now delegates to it.

## Evidence

- Red with each fix temporarily reverted (Playwright): FetchGrid back to `:row-data` gives `'original.txt' == 'edited.txt'`; removing the identifier write-back gives `'basename' == 'renamed'`; removing the swap gives the order mismatch; removing the CSS import makes the overlay block the double-click.
- Green: both tests pass under Playwright (dev build, no workaround) and Selenium. Client vitest 706/706, vue-tsc clean, lint clean.
- Untested: a red run under Selenium, and a production-build run.
