# Baseline refactor

The `getClientFilters`/`itemPassesFilters` extraction from `historyItemsStore.ts` now sits in its own pure-refactor commit, ahead of the HistoryPanel fix. The final tree is identical to the old head: `git diff 864f139b58f b2722375165` is empty. The new head is `b2722375165`, force-pushed to `jmchilton`.

## Commits

1. `fa168dd5e85` **Baseline tests: Make new datasets private preference.** Unchanged, and still first.
2. `84c60401e4c` **Add history_panel_item_delete helper.** Unchanged. This refactor was split out in the earlier round.
3. `4a8ee762bf2` **Extract getClientFilters and itemPassesFilters from historyItemsStore.** New. It moves the store's "filters minus `related`" parse and its parent-or-sub_item test into `HistoryFilters.js`. This is behavior-neutral: `Boolean(item.sub_items?.some(...))` matches the old `!item.sub_items || !...some` branch for undefined and empty arrays, and the `related` strip is the same expression.
4. `166ea66a203` **Keep history items shown after delete/undelete/unhide if still in filter.** This commit now changes only `HistoryPanel.vue` and the `HistoryView.test.js` vitest. Its message no longer claims the extraction.
5. `b2722375165` **Test deleting, undeleting, purging and unhiding history items.** Cherry-picked unchanged.

Splitting it this way keeps the fix commit down to the behavior change. If John moves the fix to its own 26.0 PR, commits 3 and 4 go together.

## Not split out

- **The `overrides`/`itemOverrides` params on `create_datasets`/`createWrapper`.** Only the fix's new `it.each` uses them. Without a caller they would be unused scaffolding in a refactor commit.
- **The client test hooks** (`data-description`, `title-link-class`). They already live in the "Baseline tests" commit along with the only test that uses them.

## Tests

- At `4a8ee762bf2`, the base `HistoryView.test.js` plus `src/stores/` passed: 38 files, 397 tests.
- The red check, also at `4a8ee762bf2`, used the fix commit's `HistoryView.test.js`. 3 tests failed and 10 passed. The failures are exactly the 3 "keeps item shown: true" cases. So the red belongs to the fix commit, not to the extraction.
- At the head, `HistoryView.test.js` passes 13/13.
- The pre-commit hooks passed: eslint and prettier on commits 3 and 4.
- E2E was not re-run. The head tree is byte-identical to `864f139b58f`, so the earlier Playwright and Selenium greens still apply. Those are in `polish_e2e_tests_debrief.md`, which covers the delete, unhide and privacy tests. `test_rerun_deleted_dataset` was last run in `earlier_drafts/1/baseline_refactor.md`.
