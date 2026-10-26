Picked up existing branch (draft #710) for the 2026-10-26 egapx comment on #672. Rebased onto `main` `f48c01b6` (generated-file conflicts resolved by recast).

- `f0727bd3`: §4 lists `data_collection`, `color`, grouping types. §3 documents the collection runtime object, array vs keyed `elements`, `has_single_item`/`unpaired`, leaf `element_identifier`, legacy `to_cwl` divergence. Map-over `element_identifier` kept as null (API-tested earlier; galaxy#24434/#24422 open). §5 example gains discovery `format`.
- `16be0d31`: normal review fixes. `21431450`: codex fix (nested lists hold collections).
- Evidence: Galaxy dev `87d295c9` source reads (code-read only for collection shapes). gxwf 1.14.0 accepts a `data_collection` probe tool. §5 example passes gxwf built from gtu-ts `main` `539c16c9`, fails 1.14.0.
- Brief said "list → elements map"; source says array (`is_list_like`, `DataCollectionListRuntime`). Followed source.
- Gate: `make check` green except `validate-roadmap` (#672 not a native sub-issue of #501 on GitHub) and `check-vendored` (stale local upstream clones, machine-only).
- Not done here (not a note change): gxwf release + pin bump; gtu-ts property-path check after `inputs.X`; Galaxy builder-shape divergence (runtimeify vs `to_cwl`).
- Thermo-nuclear review skipped: docs only, no implementation code.
