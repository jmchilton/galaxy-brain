# faqs/galaxy/collections_build_list_paired.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ea9238b123d` (`faq_server.sh main`). Built a
`list:paired` from `sampleA_1.txt`/`sampleA_2.txt`, renamed the identifier by hand. Used by ~25
tutorials (assembly, epigenetics, microbiome, sequence-analysis, transcriptomics/ref-based, ...);
nothing here breaks them.

## GTN

- Steps hold; screenshots match 26.2. With every item ticked the button reads **All N selected**.
- **List of Paired Datasets** is preselected when names pair; the wizard has three steps (What are
  you building?, Auto Pairing, Builder).
- "Edit the List Identifier": say how — double-click the cell.
- Last step is obsolete: selection mode ends on Build. Originals are hidden by default.
- Stray space in `` `_1 ` ``.

## Galaxy

- Coverage exists: `test_build_paired_list_auto_matched` (auto-pair), `..._manual_matched`, and
  identifier editing via `list_wizard_click_cell_and_send_keys` (`test_build_list_of_lists`).
- `list_wizard_click_cell_and_send_keys("identifier", 2, ...)` edits a paired row too (appends).
- gxui: `collection-build list:paired` follows the FAQ path but can't edit identifiers; the replay
  notes that step.
