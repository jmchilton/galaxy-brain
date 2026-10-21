# faqs/galaxy/collections_rename.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `0450e986d59` (`faq_server.sh main`). Renamed a two-element
list from its panel view. Used by assembly/ecoli_comparison, genome-annotation/tnseq,
imaging/hela-screen-analysis, microbiome/dada-16S, transcriptomics/full-de-novo.

## GTN

- No findings. Click the collection, click its name at the top, type, Enter.

## Galaxy

- Coverage exists: `test_rename_collection` (`history_panel_collection_rename`).
- gxui (tip `0450e986d59`): `collection-rename HID NAME`.
