# Implementation

Follow-up to mvdbeek's review on #23995; plan in [the #23995 review note](../issue_23977_datatypes_fanout_26.1/review_datatypes_errors.md).

## Commits (on `origin/dev` `5deaa44ee72`)

- `d6ed180f335`, `ea6da51162b`, `24c5e0c6530`: cherry-picks of #23995 (`47493679da2`, `b2ec6aac24c`, `aaf966c2e46`). The last conflicted with `dev`'s Vue 3 compat work: provider `render()` now uses the compat slot lookup, `LibraryDataset` stubs use `setup()`, and `BAlert` became `GAlert` (`dev` dropped `BAlert` from these components).
- `333b511c6d4`: ports #23995's tests to `@vue/test-utils` v2. `storeProviders.test.js` and `HelpText.test.ts` used `localVue`/`scopedSlots`/`destroy()`. `helpTermsStore.test.ts` imported `ref` statically while `vi.resetModules()` reloaded `vue` for the store, so the store's watcher never saw term changes; it now takes `ref` from the reloaded `vue`. **The #23995 forward-merge into `dev` will hit these same failures.**
- `4cde646c1cb`: the composable.
  - `useUploadDatatypes()` in `composables/datatypes.ts`, beside `useDetailedDatatypes`: `{ datatypes, loading, error }` over `datatypeStore`. Retries come from `memoizeUntilRejected` in `Upload/utils`.
  - `useUploadConfigurations` drops its private loader (and its "Maybe a store would be better" TODO); keeps the "Unable to load upload formats" toast via a watch on `error`.
  - `CollectionEditView` uses the composable instead of `DatatypesProvider`. It now fetches at setup even when the celery-only Datatypes tab is hidden; the request is shared app-wide.
  - `datatypeStore` imports `getUploadDatatypes` by name so tests mocking `@/components/Upload/utils` reach it.

## Testing

- Red first: `composables/datatypes.test.ts` (success; error exposed). Existing `uploadConfigurations.test.ts` `"formats"` case covers the switch.
- No `CollectionEditView` test exists; not added (heavy to mount).
- Local, node 22.20.0: providers, LibraryDataset, HistoryOperations, Collections, stores, Upload, Help, composables, sharedPromise — 101 files / 864 tests pass. `vue-tsc --noEmit` clean. Prettier/eslint clean (one pre-existing `@onChange` warning).

## Not done

- `DbKeyProvider`/`dbKeyStore` still catch and log; same treatment would fit.
- `SelectionOperations` and `LibraryDataset` keep `DatatypesProvider` (Options API).
