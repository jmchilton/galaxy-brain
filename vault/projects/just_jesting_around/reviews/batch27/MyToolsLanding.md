# MyToolsLanding

Selected originator: `client/src/components/Panels/MyToolsLanding.test.ts`. Baseline and final: **1 test**.

The case now reads as arrange (mount with a visible favorite order), precondition, drag, persisted order. `mountWithFavoriteTools(order)` keeps the fresh Pinia, registered user, favorite tools, `reorderFavorites` spy and props in one place, and takes the starting order inline so both orders sit in the test. `dragFavorite(list, oldIndex, newIndex)` holds the Sortable-callback driving and its happy-dom rationale; it moves the DOM node in either direction. The list is found through the attached wrapper rather than `document`, mount uses `props` and `withPlugins(localVue, pinia)` instead of legacy `localVue`/`propsData`, and `enableAutoUnmount` replaces the manual unmount. Typing the order as `FavoriteOrderEntry[]` removes the `as never` cast and the `as object` component cast.

Preserved: the same tools, preference favorites, order entries, user, mocked `reorderFavorites`, the `["cat1", "cat2"]` initial-order assertion, the exact start/update/end callback sequence and event payloads (item 1 dropped at 0), and the exact persisted `[cat2, cat1]` order. Red checks: a no-op drag (0 → 0) fails the persistence assertion; a downward drag (0 → 1) reaches the same order and passes, confirming the helper's other direction.

Reuse: existing `getFakeTool`, `getFakeRegisteredUser`, `nth` and `withPlugins`. The Sortable driving has no other consumer in `client/src`, so it stays local.

Validation: 1 test passes shuffled (seed `270101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (after import-sort autofix) and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: none new.
