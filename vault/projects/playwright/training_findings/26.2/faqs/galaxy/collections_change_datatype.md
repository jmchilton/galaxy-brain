# faqs/galaxy/collections_change_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `a32e15d771d` (`faq_server.sh main`, Celery on).
Changed a two-element txt list to tabular. Not embedded in any tutorial.

## GTN

- No findings. Steps, labels and icons hold; the Celery section is accurate (the Datatypes tab is
  gated on `enable_celery_tasks`).

## Galaxy

- Coverage exists (`test_change_datatype_simple_list`), but its steps were private to the test.
  `a32e15d771d` moves them into `collection_edit_change_datatype` and adds
  `history_panel_collection_edit(hid)`: the old `collection_menu_edit_attributes` was a bare
  `.edit-btn`, which only found the collection because it was the newest item.
- gxui (tip `400337ea9ec`): `collection-change-datatype HID TYPE`; waits until every element has it.
