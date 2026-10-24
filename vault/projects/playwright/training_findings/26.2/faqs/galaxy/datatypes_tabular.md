# faqs/galaxy/datatypes_tabular.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `bcabe015080`. No tutorial embeds it. Replay: `datatypes_tabular.gxui.sh`.

- `tabular-datatypes-tab` (main): Edit Attributes tabs are Attributes, Datatypes, Permissions
  (26.1 too), so **Datatypes** is the 2nd tab, not the 3rd. A plain `tabular` has no column fields on
  **Attributes**; after changing to `interval`, Attributes shows Chrom/Start/End/Strand/Name column
  selects. So change the datatype first, then assign columns.

Galaxy: no test set column metadata from the Attributes tab. Added `metadata_select` and
`attribute_field` selectors, `edit_dataset_attribute_fields`, `edit_dataset_set_metadata_select` and
`test_history_dataset_assign_interval_columns` (bcabe015080; Playwright and Selenium pass, fails with
Save removed). gxui: `dataset-attributes HID`, `dataset-set-metadata HID NAME VALUE`. Saving the
Attributes tab blanks a `0` **Number of comment lines** (`payload.get(name) or None`); that's the known
comment_lines bug, being fixed elsewhere.
