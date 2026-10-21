# selenium_multiview_copy test challenges debrief (2026-10-20)

Head went from `0edf965c80f` to `5c2f9c24a4d` (force-pushed to `jmchilton`). It's still 3 commits on `release_26.2`. The only change is a one-line fixup in the switch-test commit.

## Result
- No unit tests in the branch, so the unit, mock and vitest challenges don't apply. There are no API or integration tests either.
- Both new E2E tests stay. Each checks something visible: the API state after a drag, and the button labels before and after a switch. Neither just checks the selectors.
- Both tests use the existing helpers: `dataset_populator.new_dataset`, `new_history`, `get_history_contents`, `wait_for_history_to_have_hid` and SmartTarget `wait_for_text`. They follow writing_tests.md and the E2E vault notes: API setup, smart components and `_wait_on` for transitions.
- Strengthened `test_switch_to_history_from_column`. Its final "Switch to" check on the source button is now inside `_wait_on` instead of a bare assert.
- I checked again on `release_26.2` that `current_label`, `switch_history` and `#history-column-` have no callers in `lib/`, `test/`, `client/src/` or `packages/`.

## Red/green
- `test_switch_to_history_from_column` is clean. Its selectors exist on base but point at dead ids, so reverting the branch makes it time out on the selector it exercises.
- `test_copy_dataset_between_columns` fails without the branch, because `multi_history_copy_item` and `history_column_item` don't exist on base. That is the "fixture doesn't exist" case the process warns about.
  - I kept it anyway. In a test-hook PR the helper is the deliverable.
  - The meaningful red is reverting only the Vue `data-history-id` hook, which makes it time out on the column selector (recorded in the PR description).

## Finding: Multiview target column doesn't refresh after a drop (not acted on, scope)
I tried strengthening the copy test by asserting that the copied item appears in the target column:

```python
self.components.multi_history_panel.history_column_item(history_id=target_history_id, hid=1).wait_for_visible()
```

It failed consistently.
- The API showed the copy had worked, but the screenshot showed the target column still saying "This history is empty".
- The cause is `client/src/composables/historyDragDrop.ts:166`, from `c7423339250` ("only load/pin history if items were copied"). The same line is on `dev`:

```ts
if (datasetCount > 0 && collectionCount > 0) {
```

- It should be `||`. Because of the `&&`, a drop of only datasets, or only collections, never calls `loadHistoryById` or `pinHistory`, so the target column stays stale.
- Red/green, run locally under Playwright:
  - With the assertion and without the fix, it failed twice: in a full-file run and when run alone.
  - With the assertion and `&&` changed to `||`, it passed.
- I kept the fix and the assertion out of this branch. This PR only adds test hooks, and a product fix may belong on an older release base.
- Reviewers should also know that with `||`, a dataset-only drop also triggers the pin branch when histories are pinned. That matches what `c7423339250` set out to do, but it changes behavior.
- **Recommendation:** a separate fix branch with the one-line fix and the assertion above, either in `test_copy_dataset_between_columns` once this branch lands or in its own test. The alternative is expanding this branch's scope. This is John's call.

## Verification
- Ran against an isolated Galaxy (8082) and Vite (5175) from the polish worktree, Playwright, headless, one run at a time.
- I used a temporary config with a freshly registered user, because the shared login user doesn't exist on the isolated database.
- On the final head (`5c2f9c24a4d`), the whole `test_history_multi_view.py` passed 6/6. Before that, each new test passed on its own on the rebased base.
- I ran `uvx ruff check`, `ruff format --check` and pre-commit (black, flake8) on the test file. All clean.
- Selenium wasn't run because there's no local chromedriver.
- Servers stopped afterwards.
