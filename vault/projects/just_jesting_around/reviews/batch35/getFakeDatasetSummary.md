# getFakeDatasetSummary

Helper: `client/tests/test-data/datasets.ts`, new. `getFakeDatasetSummary(overrides: Partial<HDASummary> = {})` returns a complete, typed `HDASummary`: an ok, visible, undeleted `txt` dataset with hid 1 in `history-1`, with `type: "file"`, no tags or genome build, and 2024-01-01 timestamps. `dataset_id`, the default name (`dataset <id>`) and the contents `url` derive from `overrides.id` / `overrides.history_id`, following `getFakeCollectionSummary` in `collections.ts`. Its shape is the one useHistoryDatasets already built, the only builder that satisfied `HDASummary` without a cast.

Consumers. Six suites each defined their own HDA builder; five used `as HDASummary` or `as unknown as HDASummary` over partial objects. Each keeps a one-line positional wrapper where `(id, hid, name)` reads better, and every value a test depends on stays explicit in that wrapper:
- `client/src/components/Collections/ListCollectionCreator.test.ts` (originator, 3 → 3).
- `client/src/components/Collections/PairCollectionCreator.test.ts` (supporting, 3 → 3). Its builder was an exact copy of ListCollectionCreator's.
- `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.test.ts` (supporting, 9 → 9). Drops `type_id: "dataset"` and `model_class`, which is not an `HDASummary` field; nothing under `components/Collections/` reads either.
- `client/src/composables/useHistoryDatasets.test.ts` (supporting, 20 → 20). Identical values to the factory defaults.
- `client/src/stores/datasetListStore.test.ts` (supporting, 9 → 9). Keeps `history_id: "h1"` and its 2026-08-01 timestamps. The store reads only `id` and `name`.
- `client/src/components/CommandPalette/providers/datasets.test.ts` (supporting, 9 → 9). Keeps `history_id: "history_1"`, per-dataset times, and an explicit `extension: "txt"` / `state: "ok"` because two cases assert the `"txt · ok"` subtitle.

Fields the factory now fills that some builders left out (`dataset_id`, `url`, `tags`, `type`, `genome_build`, `hid`, `deleted`, `purged`, `visible`) aren't read by the creators, the dataset list store or the palette provider. The provider reads `id`, `name`, `extension`, `state` and `history_id`.

Not adopted: `useElementReconciliation.test.ts` deliberately builds a four-field dataset for presence-only checks, and `datasetListStore`'s `{ name: "no id" }` row is an intentionally malformed input.

Validation: the 6 suites, 53 tests, pass shuffled (seed `350101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.
