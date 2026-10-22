# faqs/galaxy/datasets_change_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `755d9376924` (`faq_server.sh main`). On a BED pasted as
`txt`: pencil > **Datatypes** > **Assign Datatype** > New Type `bed` > **Save** ("Changed the type to
bed."); the item shows `format bed` and its BED metadata. Embedded in 163 tutorials.

## GTN

- No findings. Steps, tab name, section title, "New Type" label and the `galaxy-chart-select-data`
  icon (`fa-database`, as on the tab) all match 26.2.
- The type-to-filter tip holds; typing `bed` also lists bedgraph, bigbed and others, so the exact
  entry has to be clicked.

## Galaxy

- Gap: per-dataset New Type + Save was untested (only Auto-detect, the history Selection menu and
  the collection view). Added `test_history_dataset_change_datatype` (`755d9376924`) with
  `edit_dataset_datatype` and `edit_dataset_attributes.datatype_save_button`. The Save button has no
  id; it's selected as Auto-detect's previous sibling. Green under Playwright and Selenium.
- gxui: `dataset-change-datatype HID TYPE` (tip `d982e460bb0`).
