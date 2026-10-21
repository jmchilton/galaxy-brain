# faqs/galaxy/dataset_tool_errors_metadata.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `1a9b0ccb3c2` (`faq_server.sh main`). On a BED, pencil >
Edit Attributes; set **Number of comment lines** to 3 and **Save** ("Attributes updated."), then the
Attributes tab's **Auto-detect** ("Auto-detect operation successfully submitted.") reset it to 0. Not
embedded in any tutorial.

## GTN

- "Click on the Auto-detect button" is ambiguous: the Attributes tab's re-detects metadata, the
  Datatypes tab's re-detects the datatype (`tool-errors-metadata-autodetect-tab`).
- "Turns yellow": the client's `setting_metadata` state is a warning (yellow) spinner, but the tiny
  job had finished by the first screenshot (item already green). Not confirmed either way; not filed.
- The disk icon is still the download button.

## Galaxy

- Gap: only the Datatypes tab's Auto-detect was tested (`test_history_dataset_auto_detect_datatype`).
  Added `test_history_dataset_auto_detect_metadata` (`1a9b0ccb3c2`) with
  `edit_dataset_attributes.auto_detect_metadata_button` (`#dataset-attributes-default-save + button`,
  no client rebuild) and `metadata_input(name)`.
- A form save stores `comment_lines` as the string `"3"`; Auto-detect stores int `0`. Nothing found
  doing arithmetic on it; noted in the test.
- Replay uses `gxui call history_panel_item_edit` and `gxui component`; no edit-attributes verb yet.
