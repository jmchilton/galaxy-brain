# Initial implementation debrief — issue_24093_batch_element_labels_26.1

Issue: [#24093](https://github.com/galaxyproject/galaxy/issues/24093). Base: `release_26.1` (`d405ebc1f4c`). Fork branch: `jmchilton/issue_24093_batch_element_labels_26.1`.

## Root cause

Dropping hidden collection elements into a single-dataset input in batch ("Multiple datasets") mode labels them inconsistently: first `408: (hidden) <file>`, later ones `Selected: forward`.

- Client: drag sets a DCE's `name` to its `element_identifier`; the drop creates a client-only keep-option `Selected: forward` (no hid).
- Server: every drop rebuilds the form. `DataToolParameter.to_dict` pins/carries selected inputs with server labels (`(hidden) <name>` + hid), which replace the client placeholder.
- Bug: `from_json` → `to_python` collapses a batch wrapper on a non-`multiple` param to `values[0]`, so `to_dict` only sees the first value.

## Fix (server)

- `Tool.to_json` passes the raw flat request state (`params.__dict__`) to `populate_model` as `incoming`.
- `populate_model` threads `incoming` through repeats/conditionals/sections (same `full_name` keying as pagination) and passes `incoming_value` to data params' `to_dict`. Collapsed the duplicated paginated/unpaginated `to_dict` calls into one `**to_dict_kwargs` call.
- `DataToolParameter.to_dict` adds `_batch_selection`: resolves each batch value through `from_json` (same validation as the first value; `ValueError` skipped like `check_param`) and appends unseen ones to the values fed to the existing pin/carry path.

Form state still holds only the first value — dependent params (column/metadata filters) unchanged.

## Test

`lib/galaxy_test/selenium/test_tool_form.py::TestToolForm::test_batch_input_labels_dropped_collection_elements` — two paired collections, `cat1` in "Multiple datasets" mode, drag each `forward` element from the collection panel, assert chips are `<hid>: (hidden) forward` for both.

- `@playwright_only`: Selenium's `drag_and_drop` (seletools) dispatches only dragstart/drop/dragend; `FormData` needs `dragenter` to capture drag data. Verified on Selenium backend — drop never lands.
- New selectors: `tool_form.parameter_data_input_multiple`, `parameter_data_drop_target`, `parameter_data_selected_tag`.

## Validation

- Red (Playwright, before fix): `['2: (hidden) forward', 'Selected: forward']` — exact issue symptom.
- Green (Playwright, after fix): pass.
- Neighbours, Playwright: `test_run_data`, `test_data_options_paginated_smoke`, `test_data_options_load_more_appends`, `test_data_options_pinned_via_rerun` pass.
- Neighbours, Selenium: `test_rerun`, `test_rerun_with_non_latest_version`, `test_rerun_deleted_dataset`, `test_rerun_dataset_collection_element` pass; new test skips with reason.
- Unit: `test/unit/app/tools/` data/parameter/column/select/execution — 78 pass; doctests in `basic.py`/`populate_model.py` — 15 pass.
- ruff, black, isort, flake8, prettier clean; mypy (from `lib/`) no errors in touched files.

## Not done / follow-ups

- `DataCollectionToolParameter.to_dict` only pins a single DCE; batch-dropped subcollection DCEs likely have the same first-only labelling. Not reported; left out of scope.
- Selenium-backend drag parity (seletools lacks `dragenter`) — test infra gap, not fixed here.
