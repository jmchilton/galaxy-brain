# faqs/galaxy/datasets_change_dbkey.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `d982e460bb0` (`faq_server.sh main`). On a BED: expand
it, click the `?` after "database", pick `Human Feb. 2009 (GRCh37/hg19) (hg19)` in
**Database/Build**, **Save** ("Attributes updated."). Embedded in 10 tutorials.

## GTN

- No findings: the steps work as written.
- `shared/images/datasets_dbkey.svg` shows the pre-Activity-Bar masthead and left tool panel; the `?`
  it points at is unchanged (`gtn_screenshots_26_2.yaml`, low).

## Galaxy

- Covered: `test_dataset_change_dbkey` follows the FAQ's path (item `dbkey` link > Database/Build >
  Save). No new test.
- The history item shows the new build on its next poll (a few seconds), not at Save.
- `edit_dataset_attributes.dbkey_dropdown_results._` is still a select2 selector; it only works
  because its option XPath is absolute. Cleanup candidate.
- gxui: `dataset-change-dbkey HID DBKEY` maps DBKEY to its `/api/genomes` label for
  `edit_dataset_dbkey` and waits for the panel (tip `d982e460bb0`).
