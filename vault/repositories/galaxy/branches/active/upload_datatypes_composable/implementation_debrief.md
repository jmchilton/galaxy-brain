# Implementation

**STATUS: READY.** Scope is unchanged ([scope evaluation](scope_evaluation.md)). The branch tip is `962f6092f11`, pushed to `jmchilton/upload_datatypes_composable`; CI hasn't run yet.

The branch was first implemented outside the gx_workhorse process ([original debrief](earlier_drafts/1/implementation_debrief.md)). The post-implementation steps were run afterwards to recover it. It is a follow-up to mvdbeek's review on #23995, stacked on #23995's three cherry-picks (`d6ed180f335`, `ea6da51162b`, `24c5e0c6530`).

## Final shape

- **The stores own load state.** `datatypeStore`/`dbKeyStore` hold `loaded`/`error` and a `loading` getter. The fetch action skips when the data is already loaded, clears the error when a load starts or succeeds, and sets it then rethrows on failure.
- **Composables and providers are thin readers.** `useUploadDatatypes()` (`composables/datatypes.ts`) and `useUploadDbKeys()` (`composables/dbKeys.ts`) read the store through `storeToRefs` and own the `ExtensionDetails`/`DbKey` types. `DatatypesProvider`/`DbKeyProvider` come from a single `uploadListProvider` factory.
- **Consumers show load failures instead of empty selectors:**
  - `CollectionEditView` uses both composables.
  - The `SelectionOperations` modals show the error. Change Database/Build OK is disabled on a dbkey error; before, it would set every selected item to `?`.
  - `LibraryDataset` shows the error.
  - `DirectoryDatasetPicker` uses `useUploadDbKeys` with a sorted copy (it used to sort the shared array in place). `useDetailedDatatypes` now exposes `error`.
  - `useUploadConfigurations` uses both composables, sorts dbkeys by `default_genome` with the exported `dbKeySort`, and `ready` waits for config to load.
- **Test port.** `333b511c6d4` ports #23995's tests to test-utils v2. The forward-merge of #23995 into `dev` will need the same port.

## Recovery steps

- [Normal review](subagents/normal_review.md): nothing was must-fix. I acted on all 7 lower-severity findings in `2f8d85770a1`..`b86532a8fdf`. They covered the duplicated composables and providers, a stale error after a retry, the OK-to-`?` overwrite, the in-place sort and an import cycle.
- [Test challenges](test_challenges_debrief.md): `77601207bd6` rewrote 2 tests that wrote store state directly, and added tests for the picker's dbkey alert and for `CollectionEditView`. No E2E test was added, because the error states can't be driven in E2E without request routing.
- [Codex review](codex_review.md): 2 findings, both confirmed and fixed red-first (`0e3f2eae9e7`, `f02ec72f6ba`). A regression from the second fix was caught and fixed in `962f6092f11`.
- [Scope evaluation](scope_evaluation.md): keep scope as implemented.
- [Screenshots](screenshot_debrief.md): not relevant. The success path renders the same as before, and the error states can't be driven in E2E.

## Testing

On node 22.20.0, the vitest runs across the touched areas pass: 117 files / 967 tests at the tip, and 125 files / 1014 tests on the wider run after the review fixes. `vue-tsc --noEmit` is clean, prettier, eslint and pre-commit are clean, and every bug fix had a red test first.

## Follow-ups (separate branches)

- After #23995 merges, migrate `SelectionOperations`/`LibraryDataset` off the Options API providers and delete the providers.
- `RuleCollectionBuilder.vue` still calls `getUploadDatatypes`/`getUploadDbKeys` directly and only `console.log`s failures.
- `DirectoryDatasetPicker` could use `useUploadDatatypes` (it never reads EDAM fields), which would save requests. `useDetailedDatatypes` is still uncached.
- A Playwright `page.route` helper would make the error-state E2E tests and screenshots possible.

## Rebase

Once #23995 merges and `release_26.1` forward-merges to `dev`, rebase onto `dev` to drop the three cherry-picks. Keep `333b511c6d4` unless the forward-merge already ported those tests.
