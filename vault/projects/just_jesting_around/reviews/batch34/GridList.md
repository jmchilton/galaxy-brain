# GridList

Selected originator: `client/src/components/Grid/GridList.test.ts`. Baseline **5 tests** → final **10**. The 30-line "basic rendering" case is split into four named cases (loading, header/action, cells, sorting), and "operation handling" into three (conditions, handler, result message).

Not vacuous under the old helper. The operation conditions read `config.value.enabled` and `config.value.disabled` on the `config` that GridOperations passes them, and that worked with the old `{ value }` shape. Probe: seeding `disabled: true` fails the condition case under the fixed helper.

What changed:
- `mountGridList(gridConfig, limit?)` mounts with `props` and `global: withPlugins(getLocalVue(), pinia)`, replacing `createTarget` with legacy `propsData`/top-level `pinia`. `mountLoadedGridList` adds the `flushPromises()` that every case but the loading case needs.
- `dataRequests(grid)` maps each `getData` call to `{ offset, limit, search, sortBy, sortDesc }`, and `FIRST_PAGE_REQUEST` names the first call. Each `toHaveBeenCalledTimes(n)` + `mock.calls[i].slice(0, 5)` pair is now one `toEqual` over the whole request list, so the call count is still pinned.
- `cell(wrapper, row, column)`, `header(wrapper, column)` and a `SELECTORS` table replace the inline `data-description` strings.
- The pager case picks the link labelled "3" instead of `pageLinks[4]`.
- The four `as any` icon casts are dropped, since `faCopy` etc. already are `IconDefinition`. That clears four ESLint warnings.
- `vi.mock("vue-router")` is dropped. `getLocalVue()` installs a test router, and the suite passes with clean output without the mock.
- `enableAutoUnmount(afterEach)` cleans up the mounts. Module-level `vi.useFakeTimers()` and `setupMockConfig({ disabled: false, enabled: true })` stay, along with the grid fixture's data.

Preserved:
- The placeholder "search tests", the initial-loading element, and the action's text, icon and single handler call. The action click still triggers no extra request.
- The title "Test", cells `id-1`/`id-2`, and link buttons `link-1`/`link-2`.
- The header titles loop.
- The first request `[0, 25, "", "id", true]`. The header click flips it to `sortDesc: false`, the sorted header shows asc and not desc, and the second header shows neither.
- Operations 1 and 3 listed, and operation 1's handler called once with row 1. Operation 3's message shows and then clears after the timers.
- The filter request with `"filter query"` as the second call.
- Page 3 showing `id-5`/`id-6`.

Strengthened:
- The loading element disappears after the first page arrives.
- The sorted header shows desc before the click.
- The operation list is exact (`["operation-title-1", "operation-title-3"]`), not just two indexed items.
- The handler check is `toHaveBeenCalledExactlyOnceWith(row)`.
- The pager request is `offset: 4, limit: 2`.

Reuse: `setupMockConfig` (fixed in this batch), `getLocalVue`, `withPlugins`, `enableAutoUnmount`. `nth` is no longer needed. No new shared helper. `dataRequests` is specific to this fixture's `getData` mock.

Validation: 10 tests pass shuffled (seed `340101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none new.
