# GenericItem readability review — iteration 47

Originator: `client/src/components/History/Content/GenericItem.test.ts`.
Worker checkout: `/private/tmp/galaxy-readability47-worker-generic`.
Base: `e1570742723b0ea164652d6d40f417a53bf4de27`.

## Changes and reuse

- Reused `getFakeDatasetSummary`, `getFakeCollectionSummary`, `withPlugins`, `getLocalVue`, and `VisibleIntersectionObserver`. The dataset extends the existing summary with the required `HDADetailed` fields; no shared helper or production file changed.
- Replaced the single mixed dataset/collection object and `as never` mock resolutions with API-typed dataset and collection fixtures. The old HDA fixture incorrectly carried `collection_type`, causing ContentItem to treat a dataset as a collection internally; the new fixture exercises real dataset rendering.
- Converted legacy `localVue`, `router`, `pinia`, `propsData`, and top-level `stubs` mount options into VTU2 `props` and `global` with `withPlugins` so the explicit router and testing Pinia replace defaults.
- Named the table cases by item source and HTTP/network failure. The async mount helper returns the wrapper only after the initial fetch settles; error assertions receive that wrapper explicitly.
- Kept real GenericItem/provider/ContentItem/CollectionDescription integration and the same selective stubs. Kept the 3000 ms refresh, fake timer advancement, and promise flush. Unmount still happens before timer restoration and global observer restoration; the reference is cleared afterward.
- Preserved the valid missing optional `store_times_summary` fallback by overriding the collection factory's default with `undefined`.

## Complete original assertion mapping

Every original case remains for both `hda` and `hdca`: two initial errors, one fetch success, and one refresh error (8 tests total).

| Original scenario/assertion | Final equivalent |
| --- | --- |
| Initial HTTP 429 or network rejection: one fetch | Same `toHaveBeenCalledOnce()` in each named failure case |
| Initial rejection: alert contains the exception message | Same `expectFetchError(wrapper, error.message)` text assertion |
| Initial rejection: ContentItem absent | Same helper assertion |
| Initial rejection: CollectionDescription absent | Same helper assertion |
| Initial rejection: loading message absent | Same helper assertion |
| Success: alert absent | Same assertion after async mount |
| Success: ContentItem receives fetched item | Same `props("item").toEqual(item)`, now against correctly typed per-source data |
| Success: isDataset matches HDA source | Same assertion using the case's explicit `isDataset` expected value |
| Success: description only present for HDCA | Same assertion using `!isDataset` |
| Refresh: initial ContentItem present | Same assertion before changing the next fetch to reject |
| Refresh: second fetch after 3000 ms | Same fake timer advancement/flush and `toHaveBeenCalledTimes(2)` |
| Refresh: alert contains Failed to fetch | Same error helper assertion |
| Refresh: ContentItem absent | Same error helper assertion |
| Refresh: CollectionDescription absent | Same error helper assertion |
| Refresh: loading message absent | Same error helper assertion |

The 40 original assertion executions remain; success adds one fetch-count assertion per source, giving 42 final assertion executions. No snapshots, assertions, cases, or cleanup checks were removed.

## Validation and coverage

- Baseline: 1 file, 8 tests passed; `/private/tmp/readability47-generic-baseline.log`.
- Final: 1 file, 8 tests passed; `/private/tmp/readability47-generic-final.log`.
- Shuffled final: 1 file, 8 tests passed, seed `470101`; `/private/tmp/readability47-generic-shuffle.log`.
- ESLint and Prettier passed. Explicit pre-commit checks use `/Users/jxc755/projects/repositories/galaxy/.pre-commit-config.yaml.sample`; results in `/private/tmp/readability47-generic-precommit.log`.
- Baseline coverage: `/private/tmp/readability47-generic-baseline-coverage/coverage-final.json`.
- Final coverage: `/private/tmp/readability47-generic-final-coverage/coverage-final.json`.
- Both coverage runs contain 176 source files. Covered/total counts: statements **559/6162 → 570/6162**, functions **91/1839 → 93/1839**, branches **179/4297 → 190/4297**.
- GenericItem.vue is unchanged: statements **19/41**, functions **4/14**, branches **19/33**. SingleQueryProvider.js, including unmount cleanup, is unchanged: statements **25/35**, functions **11/14**, branches **8/17**.

Every previously covered statement and function remains covered. Two incidental child branch operands are no longer reached by this originator:

1. `Collection/DatasetStateSummary.ts:19`, branch `1`, operand `1`: RHS of `hdca.elements_states || {}`. The original HDCA omitted `elements_states`; HDCASummary requires it, and the existing factory correctly supplies `{}`. This fallback remains meaningful for the class's optional interface/default constructor and should be checked by its own suite/sibling coverage union; the GenericItem API summary fixture should remain valid.
2. `model/states.ts:30`, branch `1`, operand `3`: final `item.collection_type !== undefined` operand in `isDCEWithCollection`. The original HDA's invalid `collection_type` caused this operand to run; the corrected HDA fails the preceding field-presence check. The HDCA takes the ordinary HDCA path instead. This is valid behavior for collection elements, but this originator exercises HDA/HDCA, not DCE.

The initial typed factory draft also lost `ContentExpirationIndicator.vue:78` and its preceding if's fallback branch because the shared collection factory supplies `store_times_summary: null`. That field is optional in the schema; explicitly retaining `undefined` restores the previously covered valid fallback in the final coverage.

## Guidance

No README change proposed. Existing helpers and readable-scenario, typed-factory, and async-operation guidance cover this change. The README still shows legacy VTU mount examples, while helpers.js documents VTU2 and `withPlugins`; this iteration follows the helper's current contract rather than creating another mount abstraction.

This is a second concrete polling component relevant to `MARGINAL_ADVICE.md`: GenericItem mounts SingleQueryProvider with auto-refresh and has explicit unmount-before-timer-restoration cleanup. Retaining it preserves the provider's unmounted coverage. The driver can use this corroboration when deciding whether to promote the existing marginal advice; no ledger or guidance file was edited by the worker.
