## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Library dialog: "An error occurred." toast (now also on the picked-history path); wizard: existing `creationError` alert.
  <details>

  - `import-collection.js:94-99` — `makeTargetHistoryCurrent(...).then(collectionImport).catch(Toast.error("An error occurred."))`; before the refactor a picked-history failure escaped uncaught.
  - `import-collection.js:73,75` — `collectionImport` failures still toast the server `err_msg` or the generic message.
  - `ListWizard.vue:173,216-218` — creation errors render in the existing `creationError` alert; success alert now reads "Collection created and added to the history it was built from." (`ListWizard.vue:222`).
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - behavior asserted through API history contents in Selenium; vitest pins payload fallback.
  <details>

  - `test_library_to_collections.py:44` — collection lands in picked history, other history empty, picked history becomes current.
  - `test_collection_builders.py:38` — wizard list from viewed non-current history lands there, current history has no collections; asserts success alert text.
  - `test_library_contents.py:179` — baseline for Add to History > as Datasets into a picked history.
  - `useCollectionCreation.test.ts` — only pins the current-history fallback; no case for an explicit `historyId` winning (see fixes).
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - 93b3d468c01 (baseline), a15d9bd3e48 (refactor), then fixes e6f27e08f50, 4189977901c.
- [x] Are the comments free of excess archeology? Yes.
  <details>

  New comments describe current behavior/constraints only: `ListWizard.vue:48`, `useCollectionCreation.ts:7`, `import-collection.js` `makeTargetHistoryCurrent` docstring, `navigates_galaxy.py:2010` (progress bar zero-width -> reads hidden; legit non-obvious constraint). Old-bug narration lives only in commit messages.
  </details>
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Failures / fix suggestions

No FAILs. Optional:

1. `useCollectionCreation.test.ts` - add a red-to-green case for the fix itself: `useCollectionCreation(() => "history-2").createPayload(...).history_id === "history-2"`. Currently only the fallback is pinned; the override is covered only by Selenium.
2. `navigates_galaxy.py:2733` - extending pre-existing misspelled `history_panel_muli_operation_select_hid` (`muli` -> `multi`). Out of scope for a 26.1 fix; leave or rename on dev.
3. Python imports: none added; all new helpers/tests use existing top-level imports. OK.
4. Minor: `test_build_list_in_viewed_history` (`test_collection_builders.py:38`) has no `@selenium_only`/`@managed_history`, unlike neighbors - intended to run under Playwright too; confirm it passes there.
