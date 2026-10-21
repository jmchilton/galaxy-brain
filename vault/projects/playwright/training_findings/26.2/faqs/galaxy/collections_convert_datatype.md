# faqs/galaxy/collections_convert_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `311918724d0` (`faq_server.sh main`). Converted a
two-element fasta list with "Convert FASTA to Tabular"; a new list of tabular datasets appeared.
Not embedded in any tutorial.

## GTN

- Steps and labels hold (**Convert** tab, **Converter Tool**, **Convert Collection**).
- The Convert tab only appears when Galaxy has a converter for the elements' datatype (26.1 too);
  a txt list has none. Worth a line, like change_datatype's "Cannot find the feature?".

## Galaxy

- Gap: no E2E test converted a collection. Added `test_convert_datatype_simple_list`
  (`311918724d0`), with `edit_collection_attributes.convert_tab`/`converter_select`/
  `converter_select_search`/`convert_btn` and `collection_edit_convert`.
- gxui (tip `a6843763b71`): `collection-convert HID CONVERTER`; waits for the new collection's jobs.
