# faqs/galaxy/bulk_change_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `57b4747a752` (`faq_server.sh main`, now with Celery).
Two `txt` datasets changed to `tabular`. Used by imaging/dicom-anatomical-3d.

## GTN

- Steps hold. Step 3: with every item ticked the button reads **All N selected**, not "n of N
  selected".
- Step 4: the drop-down starts at "Auto-detect". Step 5's button is **Ok**.
- The source numbers two steps "4.".

## Galaxy

- No E2E covered the Selection menu's Change data type (API `test_bulk_datatype_change` covers the
  backend, collections included). Added `test_change_datatype_of_selected_items` to
  `test_history_panel.py` (`a51d2b9ed4a`): `data-description="change data type modal"` on the
  modal, `history_panel.multi_operations.change_datatype_modal` component, and
  `history_panel_change_datatype_of_selected`. Green under Playwright.
- navigation.yml children written as `${_} ...` resolve only through `component._.child`;
  `component.child` raises `KeyError: '_'`.
- `history_panel_muli_operation_select_hid` ("muli") is a rename candidate.
- gxui (tip): `history-change-datatype DATATYPE HID...` ticks the items (Select Items if needed),
  changes them and waits for the new extension.
- `faq_server.sh` now runs Celery (gravity worker + `enable_celery_tasks`). Re-ran
  `analysis_concatenate.gxui.sh` (main) and `account_create.gxui.sh` (accounts) under it: green.
  `faq_server.sh env` now exports `GXUI_GALAXY_ROOT` (the cite replay reads `test-data` from it).
