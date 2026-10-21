# faqs/galaxy/collections_force_mapping_over.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `00c72c7fa3c` (`faq_server.sh main`). Nested a two-element
fasta list with **Nest collection** and with **Apply rules** (the FAQ's Basename + List Identifier(s)
A, B recipe); both gave a `list:list`. **Sort collection** (takes a `list`) then showed "The supplied
input will be mapped over this tool: one job per list." and ran per sublist. Used by
microbiome/metagenomics-assembly.

## GTN

- Nest collection shipped in 25.1.0, but the headings say "Version > 25.1" / "< 25.1"; `list:list:`
  has a stray colon (`force-mapping-nest-version`).
- Labels hold: **Column**, **Basename of Path of URL**, **Apply**, **Rules**, **Add / Modify Column
  Definitions**, **Add Definition**, **List Identifier(s)**, **... Assign Another Column**, **Save**.
- `nested_collection_for_mapping_over.png` matches 26.2's rules summary, but its rule 2 is "Add column
  for identifier0" where the steps give "basename of column A". Same result; not filed.
- fastp, collection_column_join and metaspades aren't on the FAQ server, so their screenshots weren't
  compared; Sort collection stood in.

## Galaxy

- Gap: Apply rules tests all set the rule source JSON; none drove the Column/Rules menus. Added
  `test_run_apply_rules_nest_from_menus` (`00c72c7fa3c`) with `rule_builder_add_column_basename`;
  it also checks the mapped-over hint on Sort collection. `history_wait_for_new_collection` (`b96ef661d45`)
  replaces the hand-rolled waits in the convert test and gxui `collection-convert`.
- Nest is covered by its XML tool tests and `harmonize_optional_collection.gxwf.yml`.
- Replay uses `gxui call` for the rule builder steps; no Apply rules verb yet.
