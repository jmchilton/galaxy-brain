# faqs/galaxy/collections_autobuild_list.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ea9238b123d` (`faq_server.sh main`). Built a list of
two `txt` datasets with extensions kept. Used by climate/ocean_qcv_analysis,
digital-humanities/grobid, introduction/galaxy-intro-rdm.

## GTN

- Steps hold up to **Build**. With every item ticked the button reads **All N selected**; the menu
  item is **Auto Build List**; the switch is **Remove file extensions?**.
- Last step is obsolete: selection mode ends on Build, so there is no checkmark to click again.
- Closing paragraph is stale: **Hide original elements** is on by default, so the originals are
  hidden rather than "all files turn green"; the hidden-items (eye) counter shows them.
- "(see letter b below)" inside the bold button label reads as part of the label.

## Galaxy

- Auto build covered (`test_build_list_simple_hidden`), but nothing exercised the Remove file
  extensions switch. Added `test_build_list_keep_extensions` to `test_collection_builders.py`
  (`e31b6908bec`): `collection_builders.list_wizard.remove_extensions` component and
  `collection_builder_toggle_remove_extensions`; asserts identifiers via the API. Green under
  Playwright, red without the toggle.
- Builder lists elements newest first (`ListCollectionCreator` reverses to match the panel), so
  the list is `s2.txt, s1.txt`. Intentional.
- gxui (tip): `collection-build ... --keep-extensions`.
