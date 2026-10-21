# Re-scope review (`6f1a55e7525`, `c400bb3af48`)

Acted on: legacy `<output type="collection">` form rejected rather than repaired. It has been broken since the 2020 lxml switch (v20.09) and has no users, so the remap-fix commit was dropped and `collection_type_prefix` removed from the legacy remap and the XSD `Output`. A clear load-time error for the legacy form is queued as `gx_issues/to_file/legacy_output_collection_form_broken.md`. Also: `_input_map_over` rebuilt on `CollectionTypeDescription` (handles `paired_or_unpaired`/`sample_sheet`, returns the slice; improves `get_step_map_over` too); typed helpers with one call style; unit cases trimmed to ~5 plus `paired_or_unpaired` and `sample_sheet`; dropped the plain `..._collection_type_source_mapped` API test (unit covers it).

Not acted on:
- Client parity (declared accepted type vs. connected slice): they agree for list/paired/exact/any, and the resolution rule is the queued issue.
- Multiple connections, last wins: pre-existing.
- `..._other_input_mapped` wasn't red. Kept as a regression guard against stripping the step-wide map-over.

<details><summary>Full review</summary>

Diff vs alt touches only the 5 expected files; 16 targeted tests pass; no security issues.

Item 1 (legacy form): remap from f5c93e868b7 (2018) assigns None to lxml attributes, so it has failed since f219fa6d823 (2020-05). The only loadable form sets both attributes, which contradicts itself. No users in Galaxy, tools-iuc, tools-devteam or galaxytools. Recommendation: reject, don't fix; drop the legacy prefix from the remap and the XSD.

Item 2: (1) medium: `_input_map_over` string `endswith` misses `paired_or_unpaired`/`sample_sheet`; use `CollectionTypeDescription`. (2) string slicing. (3) client parity fine. (4) multiple connections, last wins. (5) untyped staticmethods, mixed call style. (6) trim redundant unit cases and add `paired_or_unpaired`; `other_input_mapped` not red.

</details>
