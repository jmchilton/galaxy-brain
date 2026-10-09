# Test challenges

I dropped no tests. One pair of tests was rewritten and two coverage gaps were filled, all in `77601207bd6` on top of `b86532a8fdf`. The rewritten pair is the "error recorded while a load was pending" tests: they wrote store state directly, and they now drive two overlapping loads through the composable. The gaps were the `DirectoryDatasetPicker` dbkey alert and the `CollectionEditView` load-error and success tabs, which had no test. Red checks passed: each new or rewritten test failed with the fix or template branch it covers removed, and passed with it restored. No E2E test was added (see below). Nothing is blocked.

Results, on node 22.20.0:
- The affected and related vitest dirs (providers, Libraries, HistoryOperations, stores, Help, composables, Collections, Upload, sharedPromise) ran 109 files / 893 tests, all passing.
- `vue-tsc --noEmit` is clean.
- Prettier and eslint are clean on the changed files.

## Per-test verdicts

Scope is `git diff 24c5e0c6530..HEAD -- '*.test.*'`.

### Ports of #23995 (correctness only)
- **`Help/HelpText.test.ts`: keep.** The VTU2 port is correct: `h()` takes flat props, and `global: getLocalVue()` already installs a fresh pinia, so dropping `createPinia()` loses nothing.
- **`stores/helpTermsStore.test.ts`: keep.** Taking `ref` from the reloaded `vue` is the correct fix. A statically imported `ref` comes from a different reactivity instance than the store's watcher sees.
- **`providers/storeProviders.test.js` `DatatypesProvider` cases: keep.** The port to `slots` render functions and `unmount()` is correct.

### Branch tests
- **`composables/datatypes.test.ts` and `dbKeys.test.ts`, the first four cases (loads, exposes error, clears an earlier error, does not reload): keep.**
  - The stale-error and skip-if-loaded cases guard real review fixes. The `toBe(loaded)` identity check is the no-reassign guarantee.
  - `vi.mock("@/components/Upload/utils")` stays. MSW would hit the module-scope `memoizeUntilRejected` cache, and getting past that needs `vi.resetModules()`. That brings back the reloaded-`vue` trap from `helpTermsStore`, because `mount`/`defineComponent` are imported statically.
- **Same files, "clears an error recorded while a load was pending": rewritten.**
  - The old version assigned `store.uploadDatatypesError = …` / `uploadDbKeysError = …` mid-flight, which pokes at the implementation.
  - The new "clears the error from an older failed load once a newer load succeeds" mounts two consumers with separate pending loads. It rejects the older load and asserts that the error is visible, then resolves the newer one and asserts that the error is cleared and the data loaded.
  - Without the success-path `…Error = null` from `b86532a8fdf`, the test fails (verified).
  - In production, `memoizeUntilRejected` makes the race rare, since concurrent callers share a promise. Clearing on success is still a store-level contract, so the test is kept rather than dropped.
- **`datatypeStore.test.ts` (+error/loading asserts): keep.** These are cheap and state the store contract directly.
- **`storeProviders.test.js` `DbKeyProvider` cases: keep as is.** They test slot-prop wiring, which is a different consumer than the composables. Their order dependence, with the failure case first, is documented in a comment.
  - A partial `vi.mock` of `getUploadDbKeys` alone (as in `CollectionEditView.test.ts`) would remove the order dependence without reloading modules, and `DatatypesProvider`'s MSW path would be untouched.
  - I kept MSW so the failure case goes through the real request and `errorMessageAsString` path. That trades file-order independence for the real request path. The same choice applies to the picker test below.
- **`SelectionOperations.test.js` "Change Database/Build" (two cases): keep.**
  - They test the bug fix (`okDisabled`) through the modal's props, with an enabled baseline.
  - Calling `useDbKeyStore().fetchUploadDbKeys()` directly is needed because `shallowMount` stubs `DbKeyProvider`.
  - The modal's error `GAlert` sits inside the stubbed provider's slot, so it isn't asserted here.
- **`LibraryDataset.test.js` failed-dbkey case: keep.** It mirrors #23995's failed-datatypes case and asserts the rendered text.
  - `mockFailedDbKeyProvider` is byte-identical to #23995's `mockFailedDatatypesProvider`. They could share one stub factory, but merging them would touch #23995's lines and make the planned rebase harder, so I left both.
- **`DirectoryDatasetPicker.test.ts`: keep both cases, plus one added.**
  - The sort case tests behaviour through selector props. The "shared order unchanged" case is the right unit-level proxy for the in-place-sort bug.
  - **Added:** "shows an error instead of the Database/Build selector when Database/Builds fail to load". It uses an MSW 500 on `/api/genomes`, which goes through the real composable and store.
  - It runs first, with a comment, because successful loads are cached at module scope and rejections aren't. This follows the `storeProviders` precedent, and is the same tradeoff (real request path over order independence; a partial `vi.mock` would avoid it).
  - The success cases moved under a nested `describe` with their own genomes handler.
  - `mount` (not `shallowMount`) is kept: `GModal`'s slot must render to reach the `SingleItemSelector`s.
- **New `Collections/common/CollectionEditView.test.ts`: added.** The original debrief skipped this file as "heavy to mount". With the reusable `@/composables/__mocks__/config` (ref-based `setMockConfig`), it was not heavy.
  - Setup: `vi.mock` of `getUploadDatatypes`/`getUploadDbKeys`, which matches the composable tests and avoids order dependence (here the request path is already covered elsewhere, so order independence wins). MSW serves the collection, attributes and suitable_converters endpoints. `FormDisplay`, `DatabaseEditTab` and `ChangeDatatypeTab` are stubbed.
  - Error case: both tabs show "Unable to load …: <msg>", and neither edit tab renders.
  - Success case: `genomes` and `datatypes` reach the tab components.
  - Red checks: replacing the error branches with `v-else-if="false"` failed the error case; passing `[]` instead of `dbKeys`/`datatypes` failed the success case.
  - `setupMockConfig` from `@tests/vitest/mockConfig` doesn't work for `<script setup>` templates. It returns `{ value }` objects, which aren't refs, so `config.enable_celery_tasks` is undefined and the Datatypes tab never renders. The `__mocks__/config` refs work.

## E2E

Not added. The behaviour is an error state on a failed `/api/datatypes` or `/api/genomes` request:
- Selenium can't intercept requests.
- Galaxy's Playwright driver has no route-interception helper. `has_playwright_driver.py` has none, and no existing test uses one; `@playwright_only`'s "network interception" is only a docstring example.
- Forcing a real server to fail those endpoints isn't practical.

The rendering is now covered at the component layer, including `CollectionEditView`. A Playwright-only test would first need a reusable `page.route` helper in the driver. That would be a separate infrastructure change, and the worktree has no `.venv` for it. **Recommendation only:** if such a helper lands, one Playwright-only test could open a collection's edit view with `/api/genomes` routed to 500 and assert the alert.

## Not acted on
- **The duplicated `datatypes.test.ts`/`dbKeys.test.ts` (and the duplicated store actions).** The duplication mirrors the duplicated production code. A `describe.each` across both would break test-next-to-source adjacency. Collapse them only if the stores share a loader.
- **`mount(X as object, …)` casts** in the picker and `CollectionEditView` tests. They match the existing picker test; removing them wasn't checked file by file.
