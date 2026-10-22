# Implementation re-scope debrief

The first scope evaluation recommended expanding (Scope B + C). The test-only version is kept as `selenium_delete_items_dataset_privacy_alt_original_scope` (`b1288fcd9b1`, see `alts/original_scope.md`).

## What changed

- **`a7b1a4e78dd` HistoryPanel fix.** `onDelete`, `onUndelete` and `onUnhide` hid the item up front and relied on the `historyItems` watcher to show it again. Under Include deleted or Include hidden, the store filter never reads `deleted`/`visible` and `mergeArray` updates in place, so the item stayed hidden until the filter changed. Found by the hardened delete E2E. New `hideIfFilteredOut` hides only when the changed item fails the current filters. `getClientFilters` in `HistoryFilters.js` ("filters minus `related`") is now shared with `historyItemsStore.getHistoryItems`. The vitest in `HistoryView.test.js` drives the HistoryCounter buttons: 3 cases red before the fix, all green after, plus 2 controls proving the panel still hides when it should.
- **Delete E2E tightened.** Right after Undelete, with Include deleted still on, hid 1 must be visible with its delete button.
- **Client test hooks.** `data-description="make new datasets private"` on the switch and `title-link-class="dataset-edit-permissions-tab"` on the Permissions tab. `navigation.yml` uses them instead of `input[name="check-button"]` and a text XPath.

## Validation

- Vitest: `HistoryView.test.js` 13/13, plus related dirs (105 files, 821 tests).
- eslint, prettier and vue-tsc are clean, and the client builds.
- Both E2E tests are green under Playwright and Selenium.
- The re-scope review says ship it; I acted on one nit.
- Not shown: the tightened E2E going red without the fix (needs a second client build). The vitest red is the red.

## Open

- The bug exists on 26.0 through dev. It stays bundled on 26.2 because the privacy test needs 26.2. John may prefer it on its own PR off 26.0.
