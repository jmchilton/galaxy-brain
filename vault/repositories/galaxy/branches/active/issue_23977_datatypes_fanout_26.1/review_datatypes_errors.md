# Review: datatype load errors (mvdbeek, 2026-10-09)

Comment on `storeProviders.js:97`: "This seems problematic, we'd want to handle this in callers, no?"

## Reading

The PR moved the catch out of `datatypeStore.fetchUploadDatatypes` (which used to log and return) so callers see the rejection. `helpTermsStore` needs it to stop loading and retry. `DatatypesProvider` is the other caller; without its catch, `load()` rejects in `mounted()` and stays `loading`. That catch kept 26.1 behavior: log, render `[]`.

The fair part of the comment: the provider's consumers couldn't tell a failed load from an empty list.

## Done on this branch (`aaf966c2e46`)

- `SimpleProviderMixin` passes an `error` slot prop; `DatatypesProvider` sets it via `errorMessageAsString` instead of logging.
- `CollectionEditView` Datatypes tab: danger `BAlert` instead of an empty `ChangeDatatypeTab` (`[]` passed its `v-if`).
- `SelectionOperations` change-datatype modal: inline `BAlert` instead of the selector (OK was already disabled). Not `operation-error`, which reports operation results and would render behind the modal.
- `LibraryDataset` edit cell: current `file_ext` read-only with the error. Save is unaffected since the extension only changes on selection.
- Tests, red first: `storeProviders.test.js` (error exposed on failure, empty on success), `LibraryDataset.test.js` (failed provider stub). `SelectionOperations` and `CollectionEditView` have no harness reaching the provider slot; not added.
- Local: providers, LibraryDataset, HistoryOperations, Collections, datatype/helpTerms stores, Upload utils suites pass (87 tests); prettier and eslint clean.

Reply to mvdbeek not posted yet.

## `dev` follow-up (separate branch)

- `useUploadDatatypes()` composable on `datatypeStore` returning `{ datatypes, loading, error }`.
- Switch `useUploadConfigurations` (`composables/uploadConfigurations.ts`) to it. Its private loader calls the same `getUploadDatatypes(false, AUTO_EXTENSION)` and carries a `// TODO: Maybe a store would be better`.
- Move `CollectionEditView` (`<script setup>`) to the composable. `SelectionOperations` and `LibraryDataset` are Options API; they keep the provider until converted, then it can go.
- Same treatment for `DbKeyProvider`/`dbKeyStore`, which also catch and log.
