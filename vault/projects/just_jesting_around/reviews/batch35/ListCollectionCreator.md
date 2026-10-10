# ListCollectionCreator

Selected originator: `client/src/components/Collections/ListCollectionCreator.test.ts`. Baseline and final: **3 tests**.

The local cast-based dataset builder now delegates to the shared [`getFakeDatasetSummary`](getFakeDatasetSummary.md), keeping the positional `(id, hid, name, overrides)` form so each scenario's IDs, hids and names stay visible. `inListIds()` replaces three repeated `inListElements(...).map(id)` expressions. `selectIntoList()` used `option?.trigger`, so a name with no matching option was skipped silently; it now throws with the missing name.

Strengthened: the two drop scenarios now assert the selected list is `["a", "b"]` before the prop change, as the reorder scenario already did. That way "drops" is checked against a known starting list.

Preserved: the reorder-survives-refresh case with its `["b", "a"]` checks before and after, the working-copy identity check and the no-toast check; the removed-dataset and errored-dataset cases with their final list, toast count and exact toast messages. All datasets keep their original IDs, hids, names, `state: "ok"` (now the factory default) and the `state: "error"` override. `mount` is kept because the scenarios click FormSelectMany's rendered options.

Reuse: `getFakeDatasetSummary`, added in `tests/test-data/datasets.ts` and adopted by five other suites in the same commit.

Validation: 53 tests across the 6 factory consumers pass shuffled (seed `350101`). ESLint, Prettier and full `vue-tsc --noEmit` pass.

Guidance: none.
