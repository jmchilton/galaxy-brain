# Review: ScrollList.test.ts

Approved.

Suite run: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/components/ScrollList/ScrollList.test.ts`: 8/8 pass.

## Mapping

| Original case | Assertions | New form |
|---|---|---|
| local: loads items on scroll | 5 items after 1 scroll; 15 after 3; loader x3; 50 after all; loader x10; extra scroll keeps 50 / x10 | split: "loads one page per scroll" (5, 15, x3) + "stops loading once every item is loaded" (50, x10, extra scroll 50 / x10) |
| local: stops auto-retrying on error | x1; reject -> x2; 2 more scrolls stay x2; click Load More -> x3, 10 items | same case, same assertions; `nextTick` -> `flushPromises` after click |
| local: shows item count and total | "Loaded 5 / 50"; "Loaded 15 / 50"; button exists; all-loaded footer; button gone; `showCountInFooter` -> "50 test items loaded" | split: in-progress counts + button present / all-loaded footer + button absent + `showCountInFooter` |
| prop items: renders all without loading | propItems len 50; 50 divs; "All ... loaded"; no button; scroll -> `testLoader` x0 | same, but last check is now `emitted("load-more")` undefined |
| store loader: updates propItems on scroll | len 0; 5 divs / propItems 5 / x1; 15 / 15 / x3 | same assertions |
| store loader: count discrepancy | "0/50"; "5/50" x1; external add, still x1, "6/50"; adjust on -> "6/51"; scroll -> x2, "11/51"; adjust off -> "11/51" | same assertions, same order; external-change arithmetic in `mountWithStoreLoader` unchanged |

No assertion dropped or loosened. `.length).toBe(n)` -> `toHaveLength(n)` is equivalent.

## Findings

**`load-more` replacement keeps the original intent and makes it testable.** The original comment says "since there are no items to load, the loader should not be called". That mount passed no loader, so `testLoader` x0 could never fail. In `ScrollList.vue`, `loadItems()` with `propItems` and no `loader` asks the parent for more through `emit("load-more")`, after the `!allLoaded` guard. So "nothing requested on scroll" now means no `load-more` emission. With `propTotalCount: 50` and 50 items, `allLoaded` is true and the guard returns early. If `allLoaded` were false (e.g. total 51), the same scroll would emit once. That matches the author's mutation check. The new assertion can fail when it should. The old one could not.

**`scrollToEnd` does drive the real callback.** ScrollList's `onMounted` calls `useInfiniteScroll(scrollableDiv, () => loadItems())`. The `@vueuse/core` mock captures that arrow. `scrollToEnd` awaits its returned promise, which is `loadItems`'s, and then flushes. The evidence:
- Every local/store case starts with 0 rendered items and gets exactly one page per `scrollToEnd()`.
- The loader call counts match the number of scrolls.
- These counts can only come from the captured callback, because mount never calls the loader in jsdom (`isScrollable` stays false, so its watcher never fires).

The helper also throws when no callback was registered. The old `scrollOnce` silently did nothing in that case, which removes another way for the test to pass without testing anything. The `beforeEach` null reset is correct: `enableAutoUnmount` runs `onUnmounted`, which registers a no-op callback, and the reset clears it.

**Behavior boundaries unchanged.** Same `mount`, same real children (GButton click path, GAlert, toast), same `FontAwesomeIcon` stub, same mocked composable. Nothing new is mocked. The loader is now passed straight in instead of through an arrow wrapper, and it still receives `(offset, limit)`.

**Readability and README.** Clearly better:
- Per-test arrangements replace module-level mutable spies and the `expectedTotalItemCount` global, so tests no longer share state.
- The fixed `SCROLLS_TO_LOAD_ALL` count replaces the unbounded `while` loops.
- `flushPromises` replaces the 10 ms timer.
- Test names describe the condition.

No leftover noise. The `as object` cast has a documented reason, and the `setProps` awaits are needed.

**Reuse.** `getLocalVue`, `flushPromises` and `enableAutoUnmount` are already in use across the client (79 files). No other test mounts ScrollList or mocks `useInfiniteScroll`, so the local helpers are correct. No shared helper was added.

**Scope.** Only the test file is modified. No production edits. No process comments.

Non-blocking:
- `mountWithStoreLoader`'s loader refers to `wrapper` before its `const` declaration. This is safe because the loader runs only after mount, and the original had the same shape. Just noting it.
- `mountScrollList(props: Record<string, unknown>)` drops prop typing at call sites. This is acceptable given the generic-component cast, and the README doesn't require it.
