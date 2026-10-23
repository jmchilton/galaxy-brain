# Test challenges debrief

I strengthened both vitests and kept everything else. The E2Es, Python helpers and the baseline/fix split all hold up. The only file that changed is `client/src/components/Collections/common/useCollectionCreation.test.ts`.

The branch still has 2 commits on `origin/release_26.1`:
- `d1fbcbbe086` Baseline tests (was `71257628d70`)
- `14541f7ead3` fix (was `68dd501c297`)

## Changes

- **Both vitests now run with a current history set (strengthening).** Before, the history store was empty, so `currentHistoryId` was null.
  - The fallback test asserted the literal `"current"`. That would still pass if `createPayload` ignored the store entirely.
  - The creator test would still pass if the `||` order were flipped (current before picked), and that ordering is exactly the bug.
  - Now `beforeEach` seeds `storedHistories` with `history-1`. The getter falls back to the first stored history, so `history-1` becomes current.
  - The fallback test (baseline commit) now expects `history-1`.
  - The creator test (fix commit) expects `history-2` over the current `history-1`. I also renamed it to "...in its historyId, not the current history".
- I rewrote the baseline commit through a rebase `edit` stop and changed the fix commit with `--fixup` plus autosquash. Neither was pushed.

## Red/green

- Baseline commit, with the source as it was before the fix: the fallback vitest passes.
- With the fix commit's test file but `useCollectionCreation.ts` and `useCollectionCreator.ts` from `HEAD~1`, the creator test fails at its own expect: `history_id` is `"history-1"`, expected `"history-2"`. The fallback test passes.
- Final HEAD: `src/components/Collections/` vitest passes 30/30, and eslint is clean on the test file.
- I didn't rerun the E2Es, because no Python, selectors or E2E files changed. Earlier verification: `test_library_to_collections.py` passed 7/7 under Playwright, and the new test also passed under Selenium.

## Per-test challenge

- **`test_add_datasets_to_selected_history` (baseline E2E).** Kept. This is the first coverage of Add to History > as Datasets. It passes before the fix because the dataset path already sets the picked history as current. It ticks rows by name and checks they are ticked, then asserts both that the current history switches and what the target history contains.
- **`test_library_collection_export_to_selected_history` (fix E2E).** Kept. Without the fix it fails at its own `_wait_on` ("the list in the selected history"). It also checks that the previously current history has no collection and that the picked history becomes current. It reuses `prepare_library_for_data_export(history_id=...)`, and setup goes through populators.
- **Fallback vitest (baseline).** Kept and strengthened. `test_build_simple_list_via_rules_hidden` runs the current-history fallback end to end, through ListWizard's `useCollectionCreation()`. But it would still pass with a wrong or undefined `history_id`, because the server defaults to the current history, so the vitest is not redundant.
- **Creator vitest (fix).** Kept and strengthened. It calls `useCollectionCreator` directly, not through a minimal mounted component as `client/README.md` suggests. That is fine here: the composable has no lifecycle hooks, and a wrapper would add boilerplate without adding coverage.
- **Mocks.** There are none beyond `createTestingPinia`, so there is nothing to replace with noop implementations or dataclasses.
- **Layout faking or dedicated infra test files.** None.

## The E2E / vitest split (setCurrentHistory vs historyId plumbing)

The split is right; keep it.
- In the library dialog, `setCurrentHistory` makes the picked history current before the creator runs. After that, picked equals current, so no library E2E can observe the plumbing. The vitest is the right layer for it.
- The only UI path where the plumbing alone is visible is multiview "build list from selection" on an owned, non-current history (`SelectionOperations` passes `history.id`).
- I didn't build an E2E for that path. It is a possible follow-up only:
  - The selection and builder helpers (`history_panel_item_selector`, `use_bootstrap_dropdown`) are tied to the current history panel.
  - The builder E2Es are `selenium_only`.
  - The multiview tests note that the view is "incredibly hard to navigate around".
  - It is outside this branch's library scope.

## Considered, not done

- **Create the target history via API (`dataset_populator.new_history()`) instead of the UI in both E2Es.** This fits the "API for setup" guidance, and both dialogs fetch `/api/histories` when they open. But the E2Es would need rerunning for little gain, so I left it as a nit.
- **Assert in the dataset E2E that the previously current history stays empty.** Cheap strengthening, but it needs an E2E rerun. Not done.
