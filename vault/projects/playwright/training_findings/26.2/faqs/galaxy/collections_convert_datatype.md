# faqs/galaxy/collections_convert_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `a32e15d771d` (`faq_server.sh main`). Converted a
two-element fasta list with "Convert FASTA to Tabular"; a new list of tabular datasets appeared.
Not embedded in any tutorial.

## GTN

- No findings. Steps and labels hold (**Convert** tab, **Converter Tool**, **Convert Collection**).

## Galaxy

- Gap: no E2E test converted a collection. Added `test_convert_datatype_simple_list`
  (`a32e15d771d`), with `edit_collection_attributes.convert_tab`/`converter_select`/
  `converter_select_search`/`convert_btn` and `collection_edit_convert`.
- gxui (tip `400337ea9ec`): `collection-convert HID CONVERTER`; waits for the new collection's jobs.
