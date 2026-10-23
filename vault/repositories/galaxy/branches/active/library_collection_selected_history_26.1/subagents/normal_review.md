# Normal review debrief

Verdict was approve, with no bugs. I acted on the test-strength and reuse points:
- The vitest now drives `useCollectionCreator` with `historyId: "history-2"` and checks the emitted payload. It fails if the creator stops forwarding `props.historyId`; before, only the composable was pinned.
- The collection E2E reuses `prepare_library_for_data_export`. That helper gains `history_id`, which picks the history in the dialog, and now ticks rows by name through `libraries_folder_select_datasets`. `admin_login` moved out of the helper and into its two callers, so the new test can log in and create the target history first.
- `CommonCollectionBuilderProps.historyId` is now required, matching all three creators. I also shortened the `import-collection.js` comment.

I verified the change: the vitest fails without the plumbing, `test_library_to_collections.py` passes 7/7 under Playwright, and the new test also passes under Selenium.

Not acted on:
- Letting the import go ahead when `setCurrentHistory` fails. The current behavior matches `createNewHistory`.
- `libraries_folder_add_to_history` has a single caller. It is a coherent UI action, so I kept it.
- A behavior change outside the library dialog, noted for the PR body: in multiview, "build list from selection" on an owned non-current history (`SelectionOperations` passes `history.id`) now creates the list in that history instead of the current one. The builder header already says "From history: X". The upload `DefaultBox` path now also honors its target history.

<details><summary>Full review</summary>

### Verdict
Approve, with small test and reuse follow-ups. No real bugs, nothing security-sensitive.

### Domain checks
- **Callers of `useCollectionCreator`:** the List, Pair and PairedOrUnpairedList creators. All three already declared `historyId: string` but ignored it in the payload. `CollectionCreatorIndex` passes `props.historyId`, which it already used for fetching items and waiting on the created HDCA, so it is now consistent with itself. `ListWizard` and `FormDataWorkflowRunTabs` pass the current history, so nothing changes there. `Upload/DefaultBox` passes the upload target, which is now honored. `SelectionOperations` passes `history.id`, which changes multiview behavior for owned non-current histories.
- **Direct `useCollectionCreation()` calls:** `ListWizard` and `SampleSheetGrid` keep the current-history fallback.
- **Rules path:** not affected. `buildCollectionFromRules(selection, historyId)` uses the id it is passed.
- **`setCurrentHistory` before import:** the right UX, and consistent with `createNewHistory` and `import-dataset.js`. It is also needed: `CollectionCreatorIndex` waits on the HDCA in `historyItemsStore`, which reliably polls only the current history. The plumbing is a safety net for when `setCurrentHistory` does nothing because `changingCurrentHistory` is already set.

### Test strength
- With only the `setCurrentHistory` half, the E2E passes, so it doesn't pin the plumbing.
- With only the plumbing half, the E2E fails on the current-history assert.
- No vitest pinned `useCollectionCreator` forwarding `props.historyId`. The suggested fix is a creator-level test, now done.

### Reuse
- Extend `prepare_library_for_data_export` with `history_id` and use `libraries_folder_select_datasets` (done).
- `libraries_folder_add_to_history` has a single caller; fine.

### Nits
- Make `historyId` required in the interface (done).
- Let the import go ahead if `setCurrentHistory` fails (judgment call; not done).
- Shorten the comment (done).

### Python
Imports are at the top. `@requires_new_library` is omitted, matching the sibling tests. The baseline dataset test passes before the fix.
</details>
