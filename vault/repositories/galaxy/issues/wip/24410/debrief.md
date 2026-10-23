# Debrief: UDT element_identifier null on map-over

Source: `udt_element_identifier_null_on_map_over.md`. Fix branch: `udt_element_identifier_api_test` (head d5ddac3f416, base dev 51e0a80a0db), with red-to-green API tests. Research came from foundry#672.

## Research (reviewer verified on origin/dev 2527d009dfa)
- All of the cited code exists and behaves as described: `|__identifier__` persistence, `ElementIdentifierMapper`, `UserToolEvaluator.build_param_dict` (`runtimeify` vs `to_cwl`), `adapt_dataset` (dce only), the `to_cwl` basename fallback, `process_dataset`, and `test_mapped_over_labels`.
- The Proposed Approach matches the branch's 3 commits.
- No duplicates.

## Rewrite
- Restyled to GX_ISSUE_DESCRIPTIONS: a table of paths, cause in details, context, and Alternatives (DCE refs in batch tool state).
- Reviewer changes:
  - Pinned the cause to 2527d009dfa, since `meta.py` was refactored after the branch base (`_collection_batch_values`).
  - Dropped the labels column, whose ✅ cells were mostly inferred. Kept one sentence citing the test.
  - Narrowed the conversion row to `/api/tools`, the only path tested.
  - Toned down the MultiQC line.
  - Restored the open item about XML tools with converted inputs.

## Unresolved
- The `meta.py` refactor since the branch base may need a rebase check before a PR.
- Open questions are in the issue: plain-dataset fallback (`null` vs dataset name), keying identifiers by dataset, and backport.
