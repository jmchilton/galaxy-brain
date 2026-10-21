# faqs/galaxy/collections_build_list.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `64ad58a8c2a` (`faq_server.sh main`). Built a flat list
through Advanced Build List from `sample1.fasta`/`sample2.fasta` and renamed one element. Used by
~40 tutorials (assembly, metabolomics, proteomics, transcriptomics/ref-based, ...); nothing here
breaks them.

## GTN

- Steps hold. `buildList.png`, `flat_list_selector.png` and `flat_list_edit.png` match 26.2;
  `historyItemControls.png` shows a gear 26.2 lacks (low, in the screenshots list).
- **Flat List** is preselected when names don't pair.
- "Double clcik on the file names": a single click edits a name (26.1 too), and the typo.
  Extensions are already gone (**Remove file extensions?** is on), so that example is moot.
- With every item ticked the button reads **All N selected**.
- Last step is obsolete: selection mode ends on Build.

## Galaxy

- Gap: every list test used Auto Build List and none renamed an element. Added
  `test_build_list_advanced_rename_element` (`64ad58a8c2a`) with `list_wizard.element_name`/
  `element_name_input` and `collection_builder_rename_element`.
- gxui (tip `400337ea9ec`): `collection-build list ... --advanced` takes the FAQ's path, and
  `--rename OLD=NEW` now works for flat lists too (matches the element's guessed name).
