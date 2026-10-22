# foundry#671 — iwc-test-data-conventions nested example uses `type:`

Issue: https://github.com/galaxyproject/foundry/issues/671 (scottcain, AI-posted, `needs-triage`)

## Triage (2026-10-21)

Verified on foundry `origin/main` (after #698):

- `content/research/iwc-test-data-conventions/index.md:78,87`: prose and example give the inner `list:paired`
  element `type: paired`. Vendored tests-format `Collection` = `{class, collection_type, elements, identifier,
  name, rows}`, `additionalProperties: false` — `type` rejected.
- Mis-transcription, not an IWC quirk: the linked IWC short-read QC test uses `collection_type: paired` on the
  inner element; 0 IWC `*-tests.yml` use `type: paired|list`. Scott's item 3 moot.
- Galaxy `to_elements()` (`lib/galaxy/tool_util/cwl/util.py:333-353`, v26.1.1) derives the sub-collection type by
  splitting the parent `collection_type` on the first `:`; an inner `collection_type` is accepted by the schema
  but ignored.
- Same note line 100: nested output assertions described as `element_tests:` then `elements:` — contradicts
  #698 (preferred key `element_tests:` at every level).

## Proposed fix

Drop `type: paired` from the example (no inner `collection_type` either); prose: inner type is derived from the
outer `collection_type`, an inner `collection_type` (as the IWC file has) is redundant and ignored, `type:` is
rejected. Line 100: `element_tests:` at each level. Bump revision 4→5, recast, Dashboard. No changeset.
