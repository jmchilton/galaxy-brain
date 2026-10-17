# Implementation debrief

**STATUS: READY.** Fixes galaxyproject/galaxy#24220 on `release_26.0`. The branch is stacked on `issue_24218_can_map_over_parity_26.0` (`c217ced0660`) and must land after it. Head `6abce38796f`. Second scope evaluation: keep.

## Final implementation (`c217ced0660..6abce38796f`)

1. **Baseline tests.** `FormData.test.ts` gets a drop table covering everything the client already got right: HDCA and DCE rows, a `null` collection-types row, and the `sample_sheet` direct-drop column-definition check, which had no tests before. One API test, `test_can_map_over_dce_on_collection_param`, pins how the server handles a `dce` with a `map_over_type` on a collection input.
2. **Extract `matchCollectionType`** into `collectionMatch.ts` and flatten `canAcceptSrc`. No behavior change.
3. **Match like the server.** `CollectionTypeDescription.canMatch`/`canMapOver`, the deepest input type first, and the server's `paired_or_unpaired` → `paired`/`single_datasets` rewrite. This covers all the bad rows in the issue table.
4. **Collection elements map over** like HDCAs. The `map_over_type` survives option refresh: the server lists the selected DCE without it (bug found by Codex, confirmed with an API probe).
5. **Column definitions are checked only on direct drops**, as in the server's listing.
6. **An empty `collectionTypes` means no constraint** in both drop gates, through one `restrictedCollectionTypes` computed.

## Choices

- Stacked on the 24218 branch instead of carrying a copy of its `canMapOver` fix (normal review 1).
- Ported from `issue_20657_input_processing_mode`, leaving out its hint text and option-dedupe work.
- Kept `canMatch` (26.0's name). On merge-forward to dev, `collectionMatch.ts` should switch to `accepts`.
- Did not widen the `collectionTypes` prop to `| null`: it causes type errors in child components. At runtime both gates are null-safe.
- Re-scoped once (alt `issue_24220_drop_collection_matching_26.0_alt_original_scope`) to add items 5 and 6; see [implementation_rescope_debrief.md](implementation_rescope_debrief.md).

## Verification

- Client: vitest Form + Workflow, 339/339 at head, and every commit passes on its own source. Fix commits were red at their parents. `vue-tsc` is clean, and eslint has 0 errors.
- API: `test_tools.py -k test_can_map_over_dce` passes.
- Screenshots: before/after for three drops ([screenshot_debrief.md](screenshot_debrief.md)).

## Open for John

- **`sample_sheet` map-over drops.** Drag and drop now matches the 26.0 dropdown: a map-over drop onto a `sample_sheet` input with column definitions is allowed. Each job then gets a plain list with no column data. If the server's `match_multirun_collections` is what's wrong, file a server issue, revert the `mapOverType === null` guard and flip its test.
- **PR decomposition.** The scope evaluation lists options A–E. As one PR, it is about 200 lines.

## Follow-ups (not in scope)

- On dev, move the deepest-first map-over pick into `collectionTypeDescription.ts` and use it for the workflow editor's `_effectiveMapOver`, which still goes in declared order.
- Server: `DataCollectionToolParameter.to_dict` should report `map_over_type` for a selected batch DCE; `from_json` checks neither collection type nor column definitions; the async tool-request path accepts only `hdca`.
- On dev, write an E2E drop-onto-tool-form helper. The existing drag helpers don't fire `dragenter`.
- Merge forward from 25.1: `issue_19234_batch_mode_hint_25.1` also edits `FormData.vue`.
