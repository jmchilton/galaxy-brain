# faqs/galaxy/collections_add_tag.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ea9238b123d` (`faq_server.sh main`). Tagged a
two-item list `#mytag`. Used by assembly/mrsa-illumina, genome-annotation/tnseq, microbiome/dada-16S,
sequence-analysis/quality-contamination-control.

## GTN

- All six steps hold: the collection view has the pencil, **Add Tags**, **Save**, and the tag shows
  under the name.
- Step 4 typo: "propagated to the outputs any tools" → "outputs of any tools".

## Galaxy

- Coverage exists: `test_history_panel_collections.py::test_name_tags_display` tags a collection
  from its view and reads the tag back from the history panel.
- gxui (tip): `collection-tag HID TAG...` opens the collection, tags it, returns and prints its
  tags. `history-tag` also tags an open collection, but its name and docstring say history.
