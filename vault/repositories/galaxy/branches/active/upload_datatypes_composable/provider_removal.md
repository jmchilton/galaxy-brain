# Provider removal

On 2026-10-09, after polishing, John asked to migrate `SelectionOperations` and `LibraryDataset` in this branch instead of a follow-up, because those components have to be migrated anyway. Commits `4c54f449abc`..`cea986dee14`, pushed.

## Changes

- **`enabled` option** (`4c54f449abc`). `useUploadDatatypes`/`useUploadDbKeys` take `{ enabled?: MaybeRefOrGetter<boolean> }`, the same option name as `useHistoryDatasets`, and load when it becomes true. Red-first: "waits until enabled to load" in both composable tests.
- **`LibraryDataset`** (`79642867e1a`). Its `setup()` calls both composables with `enabled: isEditMode`; `isEditMode` moves from `data()` to a setup ref. The providers used to mount only inside edit-mode cells, so the lists load lazily, as before.
  - The tests now mock `getUploadDatatypes`/`getUploadDbKeys` instead of stubbing the providers. They reset both stores per test, because `getLocalVue()` shares one pinia across the file.
  - New guard: "loads datatypes and Database/Builds only when modifying the dataset". It fails if `enabled` is dropped (red-checked).
- **`SelectionOperations`** (`7619d45e0c2`). Its `setup()` calls both composables eagerly. The old providers were eager too: they sat inside `GModal`s, a native `<dialog>` that always renders its slot, and `HistoryOperations` hides the selection slot with `v-show`. So the request count doesn't change. The `storeToRefs(useDbKeyStore())` workaround and its comment are gone.
  - The tests mock the utils, and failures are driven through the component's own load, so the `rejects.toThrow` setup line is gone.
  - New red-first assertions check the modal alert text for both dbkeys and datatypes. They couldn't be reached before, because the providers were stubbed.
- **Providers deleted** (`cea986dee14`). `DatatypesProvider`, `DbKeyProvider`, the `uploadListProvider` factory and `storeProviders.test.js` are removed. That test file was added by #23995 and only tested those two providers. `SimpleProviderMixin` is restored to its `dev` form, which drops #23995's unused `error` slot prop. Against `dev`, `storeProviders.js`/`index.js` now differ only by the two removed providers.

## Testing

Node 22.20.0:
- vitest across providers, Libraries, History, Collections, Upload, Panels/Upload, Help, composables, stores and `sharedPromise`: 151 files, 1191 tests pass.
- `vue-tsc --noEmit` is clean.
- eslint and prettier are clean. The remaining eslint warnings are about existing props and events.

## Rebase note

The provider deletion touches lines #23995 added (`storeProviders.js` mixin, `storeProviders.test.js`, `LibraryDataset.test.js` stubs). After #23995 merges, the cherry-picks drop as already applied. If the forward-merge ports `storeProviders.test.js` differently than `333b511c6d4`, the deletion of that file will conflict. Resolve it by deleting the file.

## Still open

- `RuleCollectionBuilder.vue` still calls `getUploadDatatypes`/`getUploadDbKeys` directly and only logs failures with `console.log`.
- Repeated "Unable to load upload genomes" toasts while an upload method stays mounted (see [polish debrief](polish_debrief.md)).
