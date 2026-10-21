# Phase 3 runtime review (`32632d574cb`, `3c25e7b6090`)

No blockers; mapped precompute and per-job `create_collection` share `for_prefixed_collection_type` and agree. Acting on: reject `record`/`sample_sheet` levels in a static prefix (parser + linter, extends the phase 2 fixup); drop `test_collection_type_source_prefix_list`/`_paired` API tests (duplicate the tool's XML `<tests>`); rejection test uses `get_history_contents_of_type`; drop redundant local annotations and make `output_name` keyword-only in the helper; trim `test_tool_output_to_structure_type_source_prefix` to one wiring case; fix the placeholder `help` in the test tool.

Not acted on:
- Runtime helper refusing `record`/`sample_sheet` prefixes — parser/linter is the gate; runtime still validates the combined type.
- `..._multiplied_by_mapping_structure` overlap — kept; it's the unit-level check of the mapped precompute wiring.
- Workflow-scheduling partial flush on step failure — pre-existing, low.
- Mapped `sample_sheet:list…` invalid outer type — pre-existing for any collection output mapped over a sample_sheet; queued as `gx_issues/to_file/mapped_output_over_sample_sheet_invalid_type.md`.

<details><summary>Full review</summary>

108 unit tests pass; no security issues.

1. `sample_sheet`/`record` prefixes accepted statically.
2. Two API tests duplicate XML `<tests>`.
3. Private `_get_contents_request` in rejection test → `get_history_contents_of_type`.
4. Non-mapped API tests don't assert job ok (moot once dropped).
5. Helper: redundant annotations; `output_name` coupling.
6. Unit overlap (prefix concatenation re-checked; multiply).
7. 400 correct; non-mapped error before first commit (no orphans); mapped path can't hit it (sliced subcollection never `sample_sheet*`).
8. Test tool fine; placeholder `help`.

Pre-existing: `Tree.multiply` / `map_over_collection_type` don't handle `sample_sheet` → invalid `sample_sheet:list…` outer types.

</details>
