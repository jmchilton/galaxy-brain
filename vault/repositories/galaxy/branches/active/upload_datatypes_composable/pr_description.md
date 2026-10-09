Follow-up to 🔀 #23995 - show Database/Build and datatype load failures instead of empty selectors, through shared `useUploadDatatypes`/`useUploadDbKeys` composables that replace `DatatypesProvider`/`DbKeyProvider`.

On #23995, mvdbeek asked whether datatype load failures should be handled in callers rather than in `DatatypesProvider`. This branch does that, and moves every caller off the provider so it can go. Database/Builds had the same problem: `dbKeyStore` logged a failed `/api/genomes` and handed out an empty list. Every screen built on it then showed an empty or missing selector, with nothing to say why.

| `/api/genomes` or `/api/datatypes` fails | Before (`dev` + #23995) | This branch |
|---|---|---|
| Collection edit → Database/Build tab | empty dropdown | "Unable to load Database/Builds: …" |
| History selection → Change Database/Build | no selector; OK still sets every selected item to unspecified (`?`) | "Unable to load Database/Builds: …"; OK disabled |
| Library dataset edit → genome build | no selector | current build plus "(Unable to load Database/Builds: …)" |
| Library import from directory → Database/Build | no selector | "Unable to load Database/Builds: …" |
| Library import from directory → Extension | selector offers only `auto` | "Unable to load Extensions: …" |

Run against the `dev` + #23995 sources, `DirectoryDatasetPicker`'s tests, which go through the real request path, fail at their alert assertions for both lists, and its "leaves the shared Database/Build order unchanged" test fails at `?, aa1, zz1`.

***The stores only record the error; each caller decides how to show it (an alert, a disabled OK, an inline note, or the upload panel's existing toasts).***

***This changes nothing when the requests succeed. Every screen renders the same lists and defaults as before, except that the library directory picker no longer reorders the shared Database/Build list for screens opened after it.***

***The first three commits are #23995's, cherry-picked so this branch builds on it; review from `333b511c6d4`. Once #23995 merges and `release_26.1` is forward-merged, I'll rebase onto `dev` and drop them.***

***`DatatypesProvider` and `DbKeyProvider` are deleted. Their last users, `SelectionOperations` and `LibraryDataset`, stay Options API components and call the composables from `setup()`.***

***`RuleCollectionBuilder` still calls the upload loaders directly and only logs failures; it's left for a separate PR.***

<details><summary>What changed</summary>

- **The stores own load state.** `datatypeStore`/`dbKeyStore` gain `loaded`/`error` state and a `loading` getter. The fetch action loads once, clears the error when a load starts or succeeds, and records and rethrows it on failure, so the next caller retries.
- **New composables.** `useUploadDatatypes()` (`composables/datatypes.ts`) and `useUploadDbKeys()` (`composables/dbKeys.ts`) return `{ datatypes | dbKeys, loading, error }` from the store. An `enabled` option (as in `useHistoryDatasets`) defers the load. The `ExtensionDetails`/`DbKey` types move next to them, out of `uploadConfigurations.ts`.
- **Consumers.**
  - `CollectionEditView` uses both composables.
  - `SelectionOperations` calls both in `setup()`, enabled once items are selected outside a multi-view panel, which is when its modals (and the providers inside them) used to render. The Change Database/Build modal shows the error and disables OK.
  - `LibraryDataset` calls both with `enabled: isEditMode` and shows the dbkey error.
  - `DirectoryDatasetPicker` uses `useUploadDbKeys` and sorts a copy. Before, it sorted the shared store array in place, which reordered the list for every other screen. The picker keeps `useDetailedDatatypes`, which loads EDAM details too, and that composable now returns an `error` ref, which the picker shows.
  - `useUploadConfigurations` replaces its private loaders (and their `// TODO: Maybe a store would be better`) with the composables. It sorts a copy with the configured `default_genome` first, and `ready` still waits for the Galaxy config, now explicitly.
- **Providers removed.** `DatatypesProvider`/`DbKeyProvider` and their tests are deleted. `SimpleProviderMixin` goes back to its `dev` form, dropping the `error` slot prop that #23995 added only for `DatatypesProvider`.
- **Test port.** `333b511c6d4` ports #23995's `HelpText.test.ts` and `helpTermsStore.test.ts` to Vue Test Utils v2 for `dev`; the forward-merge of #23995 needs the same port. (It also ported `storeProviders.test.js`, which this branch later deletes.)

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Stacked on 🔀 #23995 and answers mvdbeek's review comment there ("we'd want to handle this in callers, no?").

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? An inline "Unable to load Database/Builds / datatypes / Extensions: …" in place of the selector (table above), with Change Database/Build OK disabled; the upload panel keeps its existing toasts.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They mock the upload loaders (the picker mocks HTTP) and assert rendered alerts, selector items, modal OK state, when requests happen, and upload `ready`, including recovery after a failed load.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual check</summary>

- `composables/datatypes.test.ts`, `dbKeys.test.ts`: load, expose the error, clear it on a later success (including two overlapping loads), don't reload once loaded, and wait until `enabled`.
- `CollectionEditView.test.ts` (new): both tabs show their error and render no edit tab; on success the lists reach the tabs.
- `SelectionOperations.test.js`: nothing loads until items are selected, or in a multi-view panel; the Change Database/Build modal shows the error and disables OK (enabled otherwise); the Change data type modal shows its error.
- `LibraryDataset.test.js`: nothing loads until Modify; failed datatype and dbkey loads show the current value and the error.
- `DirectoryDatasetPicker.test.ts`: dbkey and datatype errors replace their selectors; sorting leaves the shared store order unchanged.
- `uploadConfigurations.test.ts`: `default_genome` first; becomes ready when genomes load after an initial failure; not ready before the Galaxy config loads.

Manually:
1. In browser devtools, block `/api/genomes` and reload.
2. Open a collection's edit view. The Database/Build tab shows "Unable to load Database/Builds: …".
3. Select history items and choose Change Database/Build. The modal shows the error and OK is disabled.
4. Unblock the request and reload. Both screens show the usual selector.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
