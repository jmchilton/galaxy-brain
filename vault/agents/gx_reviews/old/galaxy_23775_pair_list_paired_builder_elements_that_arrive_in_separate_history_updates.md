# galaxy #23775 - [26.1] Pair list:paired builder elements that arrive in separate history updates

- PR: https://github.com/galaxyproject/galaxy/pull/23775 (draft, mvdbeek)
- Base: `release_26.1` (merge-base `effaf091198`)
- Reviewed head: `51a2c7d27b3cfa6d35f343622d06fa1995705f59`
- Worktree: `~/projects/worktrees/galaxy/pr/23775`
- Files: `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue`, `.test.ts` (+70/-4)
- CI: 26 pass, 1 fail (`Startup test (3.14)`: PyPI 503 fetching `darker`, not related)

## Verdict

**Approve.** Small, correct fix that reuses the right helper. The tests go red to green. One
low-severity edge case is worth a two-line guard, either in this PR or as a follow-up.

## What it does

`addNewElementsToRowData` (the incremental path added in 97fb12440df, in 26.1 only) auto-paired
only the elements new in the current update against each other. When the mates arrived in
separate refreshes, as with the embedded upload's one `/api/tools/fetch` per file, `.1` landed
as a lone row and `.2` never met it. That is the flaky `test_upload_list_paired_from_workflow`.
Now the waiting unpaired rows plus the new elements all go into `splitIntoPairedAndUnpaired`,
and a completed pair takes the waiting row's grid slot. `userUnpairedIds` keeps pairs the user
explicitly broke apart from being re-paired, and `initialize()` clears it.

## Verification

- `npm_config_use_node_version=22.20.0 pnpm exec vitest run` on the creator spec and
  `pairing.test.ts`: 16/16 pass at head.
- Reverted only the `.vue` to merge-base: "auto-pairs mates that arrive in separate history
  updates" fails with `["single:a","single:b"]` vs `["pair:a"]`. Red to green, as claimed.
- Mutation: removed only the `!userUnpairedIds.has(...)` guard, and "does not re-pair mates the
  user unpaired" fails (`pair:a`). So the second test pins the guard and is not trivial.

## Correctness review

- **No duplicate pairs.** `newElements` is still filtered by `knownRowIds()` and `discardedIds`,
  and a waiting element is removed via `onRemove(..., false, false)` before the pair is inserted.
  No `discardedIds` pollution.
- **Index handling when both sides were waiting** (possible when filters were undetected earlier
  and get detected now over `candidates`): each `onRemove` runs after the previous splice, so the
  last returned index is still valid. Insertion ends up at the second-removed row's position.
  This matches `onPair`'s behaviour closely enough.
- **Manual pairs untouched.** Only `"unpaired" in row.datasets` rows are candidates, so existing
  pairs (auto or manual) are never broken.
- **User unpair respected.** Covered by `userUnpairedIds` and a test. `applyFilters` goes through
  `initialize()`, which clears the set. That's right, because re-filtering re-pairs everything
  anyway.
- **Filter detection** now runs on `candidates` rather than `newElements`, which also fixes the
  "opened on empty history" case where filters were never detected from a lone first arrival.
- **Performance.** Scans `rowData` once, and `autoDetectPairs` over waiting+new runs only when
  something new arrived. Cost is bounded by the unmatched count, the same cost `initialize()`
  already pays. Not a concern.
- **Reuse.** Uses the existing `splitIntoPairedAndUnpaired` / `autoPairWithCommonFilters` /
  `onRemove` / `pairedRow` helpers. No new ad-hoc pairing logic. Sibling builders don't share the
  bug: `ListCollectionCreator` doesn't pair, `PairCollectionCreator` is a single pair, and the
  wizard `useAutoPairing` / `usePairingSummary` pair a one-shot selection with no incremental
  updates. Nothing to lift into a shared fix.

## Findings

1. **Low: auto-pair can consume the active click-to-pair target and wedge click pairing.**
   `PairedOrUnpairedListCollectionCreator.vue:394-405` removes a waiting unpaired row via
   `onRemove`, but `activeUnpairedTarget` / `pairingTargetsStore` (`:789-806`) are not reset.
   If the user has clicked `x.1` to start a manual pair and `x.2` then lands and auto-pairs:
   - Every later click calls `onPair(staleId, other)`.
   - `firstIndex === -1`, so `onPair` is a silent no-op that never resets the target.
   - The target row no longer exists, so the "click self to cancel" escape can't be reached.
   - Click pairing stays dead until the builder is reopened. Drag and drop still works.

   The same staleness already exists when `reconcileWithInitialElements` drops a vanished row.
   This PR adds a more likely path, because clicking `.1` while `.2` uploads is exactly the
   workflow being fixed. A minimal fix in `onRemove` covers both paths:
   ```ts
   if ("unpaired" in item && activeUnpairedTarget.value?.unpaired.id === item.unpaired.id) {
       activeUnpairedTarget.value = null;
       pairingTargetsStore.resetUnpairedTarget();
   }
   ```
   This is fine as a follow-up if they'd rather keep the release PR minimal.
2. **Nit / informational: a hand-edited identifier on a waiting row is replaced** by the guessed
   pair name when its mate arrives (`pairedRow(pair)` uses `pair.name`). This is consistent with
   how manual `onPair` behaves, so no change is needed.
3. **Optional test gap:** no test covers the "takes the waiting row's place" ordering, e.g.
   `[a.1, z_single]` then `a.2` arrives, expect `["pair:a", "single:z"]`. That's the one
   behavioural claim in the description the tests don't cover. Cheap to add, not required.

## Draft GitHub review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not personally authored.*
>
> Looks good. Feeding the waiting unpaired rows back through `splitIntoPairedAndUnpaired` is the
> right minimal fix, and `userUnpairedIds` plus the reset in `initialize()` covers the "don't
> re-pair what I split" case. I confirmed locally that the first new test fails without the
> `.vue` change (`['single:a', 'single:b']`). Dropping just the `userUnpairedIds` guard makes the
> second one fail, so both tests are doing work.
>
> One small edge case, fine here or as a follow-up. If the user has clicked a waiting `x.1` to
> start a click-pair when `x.2` lands, the auto-pair removes that row, but `activeUnpairedTarget`
> and the pairing-targets store still point at it. Every later click then goes through `onPair`
> with a missing first row, which is a silent no-op with no reset, so click pairing is stuck
> until the builder reopens. The same thing can already happen when reconcile drops a vanished
> row. A guard in `onRemove` would fix both:
>
> ```ts
> if ("unpaired" in item && activeUnpairedTarget.value?.unpaired.id === item.unpaired.id) {
>     activeUnpairedTarget.value = null;
>     pairingTargetsStore.resetUnpairedTarget();
> }
> ```
>
> Optional: a test for the "pair takes the waiting row's place" ordering, e.g. `[a.1, z]` then
> `a.2` arrives, expect `["pair:a", "single:z"]`.
>
> The Startup test failure is a PyPI 503 and unrelated.

## Verification: click-pair target finding

**Result: confirmed** (head `51a2c7d27b3`). Claim accurate; line numbers correct.

### Static
- Auto-pair path `addNewElementsToRowData` calls `onRemove({ unpaired: el }, false, false)` at `:399` (inside `:393-405`) for the waiting mate.
- `onRemove` (`:816-842`) only splices `rowData` / updates `discardedIds`. It never touches `activeUnpairedTarget` or the store.
- `onUnpairedClick` (`:791-808`): when a target is set and the new click is a different id, it calls `onPair(staleId, clickedId, "click")`. Cancel-by-self-click needs the stale row, which is gone.
- `onPair` (`:700-777`): the stale first id gives `firstIndex === -1`, so the whole body is skipped, including the reset at `:770-771`. Silent no-op. Every later click repeats it, so pairing stays wedged.
- No other reset path. `activeUnpairedTarget` is written only at `:770`, `:793`, `:801`. `usePairingDatasetTargetsStore` (`stores/collectionBuilderItemsStore.ts`) has no watchers. `PairedDatasetCellComponent.vue` only reads `unpairedTarget` for the highlight and forwards clicks to `context.onUnpairedClick`. The grid re-render does not clear either.
- The fix's names are right: `UnpairedValue = { unpaired: HistoryItemSummary }`, so `.unpaired.id` exists, and the store method is `resetUnpairedTarget()`. Since the guard sits in `onRemove`, it also covers the older paths: reconcile dropping a vanished row (`:470`), `dismissUnmatchedDatasets`, and the grid's `context.onRemove`.

### Empirical
I used a temp spec modelled on `PairedOrUnpairedListCollectionCreator.test.ts`, with the same AgGrid stub. Grid clicks aren't rendered in the stub, so the test drives the exposed `context.onUnpairedClick` directly. I used `createTestingPinia({ stubActions: false })` so the store actions run for real. Run with `npm_config_use_node_version=22.20.0 pnpm exec vitest run`.
- Without the fix it fails: `expected ['pair:a','single:c','single:d'] to deeply equal ['pair:a','pair:c']`.
- With the proposed `onRemove` guard applied, the repro passes, all of `src/components/Collections/` passes (5 files, 25 tests), and `vue-tsc --noEmit` is clean.
- All temp changes are reverted. The worktree was clean before and after.

<details><summary>Repro spec (temporary, not committed)</summary>

```ts
// same imports / useAgGrid vi.mock / server mocks / fake-dataset builder as PairedOrUnpairedListCollectionCreator.test.ts
it("click pairing still works after the active target is auto-paired", async () => {
    const a = ds("a", "hello world.1.fastq");
    const b = ds("b", "hello world.2.fastq");
    const c = ds("c", "alpha.fastq");
    const d = ds("d", "beta.fastq");
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    setActivePinia(pinia);
    const wrapper = mount(PairedOrUnpairedListCollectionCreator as object, {
        propsData: { historyId: "history-1", initialElements: [], collectionType: "list:paired", mode: "modal" },
        localVue, pinia, stubs: { DefaultBox: true },
    });
    await flushPromises();
    await wrapper.setProps({ initialElements: [a, c, d] });
    await flushPromises();
    const rows = () => wrapper.findAll(".grid-row").wrappers.map((r) => r.attributes("data-row-id"));
    expect(rows()).toEqual(["single:a", "single:c", "single:d"]);
    const { context } = wrapper.findComponent({ name: "AgGridVue" }).vm.$attrs as any;
    context.onUnpairedClick({ unpaired: a });            // start click-pair on a
    await wrapper.setProps({ initialElements: [a, c, d, b] }); // b lands, auto-pairs with a
    await flushPromises();
    expect(rows()).toEqual(["pair:a", "single:c", "single:d"]);
    context.onUnpairedClick({ unpaired: c });
    context.onUnpairedClick({ unpaired: d });
    await flushPromises();
    expect(rows()).toEqual(["pair:a", "pair:c"]);        // FAILS without fix
});
```
</details>

### Draft comment (this finding only)

> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> Small edge case, fine as a follow-up. If you click a waiting `x.1` to start a click-pair and `x.2` then arrives, the auto-pair removes `x.1`'s row, but `activeUnpairedTarget` and the pairing-targets store still point at it. After that, every click calls `onPair(staleId, …)`, which silently does nothing and never resets. Click pairing stays stuck until the builder is reopened. I reproduced it in a vitest: start a click on `a.1`, deliver `a.2`, then click `c` and `d`, and they stay unpaired. Reconcile dropping a vanished target row already hits the same thing. A guard in `onRemove` fixes both, and existing specs still pass with it:
>
> ```ts
> if ("unpaired" in item && activeUnpairedTarget.value?.unpaired.id === item.unpaired.id) {
>     activeUnpairedTarget.value = null;
>     pairingTargetsStore.resetUnpairedTarget();
> }
> ```
