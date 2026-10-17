# Initial implementation debrief

Fixes galaxyproject/galaxy#24220 on `release_26.0`. Ported from `issue_20657_input_processing_mode` (`9ff2eb69afd`, `68b8d3969e5` map-over part only, `057ac69f904`, baseline `b89794a9f36`) and `00e2bf07047` (#24218).

## Commits

1. **Baseline tests for collection drop matching** — `FormData.test.ts` drop table (rows the client already gets right: `list:list` on `list` maps over `list`; on `list,list:list` used directly; `paired` refused on `list:paired_or_unpaired`; collection elements used directly). New `collectionTypeDescription.test.ts` (absent on 26.0) with the already-holding compound `paired_or_unpaired` `canMapOver` cases. API test `test_can_map_over_dce_on_collection_param`: the server maps a `dce` with `map_over_type` over a `data_collection` input (passes on 26.0 — pins what the client fix relies on).
2. **Match server canMapOver for compound paired_or_unpaired inputs** (#24218) — follow Python `can_map_over` rule order. Red first.
3. **Match dropped collections to inputs like the server** — new `collectionMatch.ts` `matchCollectionType()` on `CollectionTypeDescription.canMatch`/`canMapOver`, deepest input type first, server's `paired_or_unpaired` → `paired`/`single_datasets` adjustment. Used by `canAcceptSrc` and `toDataOption`. 9 red rows from the issue table, all green after.
4. **Map dropped collection elements over inputs like collections** — `toDataOption` matches on `getElementAttributes().collectionType`, so a DCE holding a collection gets `batch`/`map_over_type`. Red first.

## Port notes

- 26.0 `CollectionTypeDescription` has `canMatch`, not dev's `accepts` (same semantics, input-side receiver). Helper uses `canMatch`.
- 26.0 test file has no `emittedArg`/`nth` helpers; tests use a local `dropOnCollectionInput` helper.
- Left out of the port: `mapOverUnit`/`collectionTypeLabel` (20657 hint text), option-dedupe / keep-option replacement from `68b8d3969e5`.
- Helper takes `string` types rather than `CollectionType` to avoid casts at the DCE call site.

## Verification

- Client: `vitest` Form + Workflow suites 298/298; `vue-tsc --noEmit` clean; eslint clean (2 pre-existing `any` warnings).
- API: `test_tools.py -k test_can_map_over_dce` 3/3 pass.

## Risks / open points

- Server's async tool-request path (`__expand_collection_parameter_async`) only accepts `hdca`; the legacy tool form submission path (sync) handles `dce`. Pre-existing; tool form uses the sync path.
- #24218 commit duplicated with a parallel `issue_24218_can_map_over_parity_26.0` session.
- `issue_19234_batch_mode_hint_25.1` also edits `FormData.vue`; merge-forward 25.1 → 26.0 may touch nearby lines.
