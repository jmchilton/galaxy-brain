# Normal review (recovery)

The branch was implemented outside the gx_workhorse process, so this review ran during recovery on the branch's own commits (`333b511c6d4`, `4cde646c1cb`, `310940d62f5`). Nothing was must-fix. I acted on all seven lower-severity findings in 5 new commits (`2f8d85770a1`..`b86532a8fdf`). The three bug fixes went red-first: a stale error after a retry, an in-place sort of the shared dbkey list, and an OK button left enabled after a dbkey load failure. Afterwards, vitest passed (125 files: 1014 passed, 1 skipped by an upstream commit), and `vue-tsc`, prettier and eslint were clean.

Acted on:
- **Duplicated composables and providers, and a stale error after a retry.** `loading`/`error`/`loaded` state moved into `datatypeStore`/`dbKeyStore`. `useUploadDatatypes`/`useUploadDbKeys` are now thin `storeToRefs` readers. `DatatypesProvider`/`DbKeyProvider` are built by a single `uploadListProvider` factory.
- **Skip-if-loaded.** It now lives only in the store action, so mounting no longer reassigns the lists and retriggers every consumer.
- **`SelectionOperations` "Change Database/Build" OK stayed enabled after a dbkey load failure.** Pressing it set every selected item's dbkey to `?`. OK is now disabled while the load has an error.
- **`DirectoryDatasetPicker` sorted the shared store array in place.** It now uses `useUploadDbKeys` with a computed sorted copy, and the try/catch is gone.
- **Circular type import.** `ExtensionDetails`/`DbKey` moved next to their composables.
- **`localize()`.** It now wraps the error text in `SelectionOperations`.

Not acted on:
- **`localize()` in `LibraryDataset`/`DirectoryDatasetPicker`.** Neither file uses `localize` anywhere, so I left them unchanged.
- **Test-order dependence in `storeProviders.test.js`.** The cached promise lives at module scope in `Upload/utils`, and moving state into the stores doesn't make it easier to isolate. The dependence is documented in a test comment.
- **The picker still loads datatypes through `useDetailedDatatypes`.** That call is uncached and only logs failures to the console. Possible follow-up.

Behaviour changes: while loading, provider slot `item` is `[]` instead of `null`. Slot `save` was removed from these two providers; nothing used it.

<details>
<summary>Full normal subagent review</summary>

Verdict: nothing must-fix. The branch is small and correct. Every caller of the dbkey store catches its rejection (`DbKeyProvider`, `DirectoryDatasetPicker`, `useUploadDbKeys`). Retries work because `memoizeUntilRejected` drops rejected promises. Tests were ported, not weakened. No security concerns.

Should consider:
1. `SelectionOperations.vue`: the Change Database/Build OK button stays enabled when the load fails. `selectedDbKey` defaults to `{id:"?"}`, so pressing OK sets every selected item's dbkey to `?`. Bind `:ok-disabled` the way the datatype modal does.
2. `composables/datatypes.ts` and `composables/dbKeys.ts` are line-for-line copies, as are their tests and `DatatypesProvider`/`DbKeyProvider`. Option A: a shared helper. Option B: keep `loading`/`error` state in the stores and make the readers thin.
3. An instance keeps a stale error after a later retry succeeds. `CollectionEditView` then shows the alert over data it already has, and `useUploadConfigurations.extensionsSet` stays false. This predates the branch. Option B fixes it.

Nice-to-have:
4. The fetch short-circuit is inconsistent. Providers skip the fetch when data is loaded; composables always fetch and reassign a copied array. Put the check in the store action.
5. The debrief's reason for keeping `DirectoryDatasetPicker` on the raw store doesn't hold. Its dbkey half doesn't depend on datatypes, and `dbKeyList.value.sort(...)` sorts the shared store array in place, so the "`?` first" order breaks. The picker's datatype half (`useDetailedDatatypes`) only logs failures.
6. Circular type import: `datatypes.ts` takes `ExtensionDetails` from `uploadConfigurations.ts`, which imports `datatypes.ts`. The picker also defines its own local `DbKey`.
7. The "Unable to load Database/Builds:" text is wrapped in `localize()` in some places and not others.

Not worth it: the order dependence in `storeProviders.test.js` (documented in a comment); the `dbKeys.test.ts` order assertion, which only echoes the mock; `CollectionEditView` fetching eagerly (`GTabs` isn't lazy, so this is acceptable); the Vue 3 test ports, which are correct; toast duplication, which is not a regression.
</details>
