# Polish debrief: upload_datatypes_composable

2026-10-09. Branch tip is now `75c67e1fa27`, pushed to `jmchilton/upload_datatypes_composable`. The one polish commit drops the unused `id` prop from `uploadListProvider`.

## CI

At the start of polishing, all 7 fork runs on `962f6092f11` were queued and none had failed. The push of `75c67e1fa27` starts a new set, which hasn't been checked yet.

## Checklist (GENERAL.md)

The subagent passed every item and left the human-read item unchecked. Its flags:
- **Unused `id` prop on the provider factory:** removed. No caller passes `id`. Provider, HistoryOperations, Libraries and Collections vitest pass (93 tests); eslint and prettier are clean.
- **`CompositeFileUpload.vue` `@update:slotItem` → `@update:slot-item`:** kept. It's an eslint `vue/v-on-event-hyphenation` fix that pre-commit applied to a file the commit already touched, and it behaves the same.
- **Wording:** the picker says "Unable to load Extensions" where other screens say "datatypes". This matches the picker's "Extension" label, so it's left as is.

## Red on base

I copied HEAD's `CollectionEditView`, `LibraryDataset` and `DirectoryDatasetPicker` tests into a temporary worktree at `24c5e0c6530` (`dev` + #23995) and ran them there. Then I removed the worktree.
- **Fail at their alert assertions:** every error test in those three files.
- **Also fails:** the picker's shared-order test (`?, aa1, zz1`).
- **Fails on base but isn't cited:** the `CollectionEditView` success case. The base stores call utils through the default export, which the test's mock misses.
- **Fails before reaching the bug's assertion:** `SelectionOperations` "disables confirming". On base it stops at its `rejects.toThrow` setup line, because the base store swallows the error.

## Strengthening

The subagent fact-checked the description. Changes made:
- **Upload panel row: dropped.** "At page load" and "until reload" were both wrong. Upload methods load lazily, and reopening one retries on base too.
- **"Nothing changes on success":** qualified. The picker no longer reorders the shared dbkey list.
- **`ready` waiting for the Galaxy config:** reworded to "still waits, now explicitly". On base it already waited, implicitly.
- **Highlights:** added ones for "stores record, callers display" and for the picker keeping `useDetailedDatatypes`.
- **Base failures:** the description now cites the tests verified above.
- **Test list:** the `storeProviders.test.js` `DbKeyProvider` cases are added.

The checklist wasn't rerun, because the `id` prop removal doesn't change any of its answers.

## Left for John

- **`SelectionOperations.test.js` setup line.** Changing its `rejects.toThrow` to `.catch(() => {})` would make it fail on base at `okDisabled`. That removes an assertion, so I didn't make the change. The store's rethrow is covered in `dbKeys.test.ts`.
- **Repeat upload toasts.** Every mounted `useUploadConfigurations` watches the shared dbkey error. While an upload method stays mounted after a failure, each retry that fails (from any screen) re-toasts "Unable to load upload genomes". This hasn't been verified in a browser.
- **The PR targets `dev` while stacked on #23995.** Opening it now shows #23995's diff a second time; the description says to review from `333b511c6d4`.

# Re-polish after provider removal (2026-10-09)

The tip is `788cef7a92e`, pushed. Fork CI on `cea986dee14` was queued at the start and showed no failures; the run on `788cef7a92e` hasn't been checked.

## Checklist

The rerun on `24c5e0c6530..cea986dee14` passed every item; the human-read item is left unchecked. What it found:
- The picker's test order dependence is still there and still documented.
- The `pinia` mount option has no effect, but that's an existing habit across tests.
- In the datatype modal, OK stays disabled on a failure only because nothing is selected yet.

`788cef7a92e` got a focused recheck.

## Red on base

HEAD's tests for `CollectionEditView`, `LibraryDataset` and `SelectionOperations` also fail on base, but those failures are vacuous. The base stores call the loaders through the `UploadUtils` default export, and the tests' named-export mocks never reach it. The clearest case is `LibraryDataset`'s datatype-error test, which fails on base even though #23995 already shows that error. So the description now cites only `DirectoryDatasetPicker`, whose tests go through MSW, the real request path.

## Strengthening

The review found a real regression. `7619d45e0c2` made `SelectionOperations` load eagerly, which missed the root `v-if="hasSelection && !isMultiViewItem"` that used to gate its modals. Every history panel, including multi-view panels, would have requested `/api/genomes` and `/api/datatypes`. `788cef7a92e` gates the load on `enabled`, with 2 tests that failed first. The History vitest suite passes (270 tests).

Description fixes:
- Before column: "empty selector" becomes "no selector" (`SingleItemSelector` renders nothing for `[]`), or "empty dropdown" for the collection tab.
- The `SelectionOperations` timing bullet is rewritten.
- Added a `RuleCollectionBuilder` scope highlight and trimmed the provider highlight.
- The checklist now says "mock the upload loaders" instead of "HTTP layer".
- Context says "Stacked on", since #23995 hasn't merged.

Not done:
- Moving `CollectionEditView`'s error test to MSW so it could be cited as red on base. It's optional, and it would mean reworking that file's `vi.mock` setup and success test.

## Left for John

- The opener "Follow-up to 🔀 #23995" isn't in the controlled list.
- `SelectionOperations` now loads on selection, as base did. Loading when a modal opens would mean fewer requests, but behave differently.
- The repeated upload toasts are still unverified in a browser.
