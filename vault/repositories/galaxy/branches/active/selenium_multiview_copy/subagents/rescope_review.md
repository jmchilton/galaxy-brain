# selenium_multiview_copy re-scope review (2026-10-21)

Reviewed `161dd567a39`; I acted on two test-quality findings and one round of PR description wording. The new head is `20b3266c03d`, force-pushed to `jmchilton`. It's still 6 commits on `release_26.2`, with the Baseline tests commit first and the fix commit last.

- **The pin vitest cases now use the real caller's shape.** Both pin cases used to call `useHistoryDragDrop(TARGET, false, true)`, but no caller does that. The only `pinHistories=true` caller is the "new history" box in `MultipleViewList.vue`, which calls `(undefined, true, true)`.
  - Both cases now go through that shape. A `setUpNewHistoryBoxDrop` helper stubs `createNewHistory` so it sets `currentHistoryId`, using a writable testing-pinia getter with the `@ts-expect-error` idiom from `App.test.ts`.
  - They now assert that `createNewHistory` ran, that `copyDataset` targeted the new history, and that `pinHistory` got the new and source ids.
  - The dataset-only case also gained `loadHistoryById` not called, which the mixed case already checked.
  - The mixed case is amended in the Baseline commit and the dataset-only case in the fix commit.
- **Dropped the copy test's redundant pre-waits** in the fix commit. Once the screenshot moved after the drop, the two `wait_for_visible` calls before `multi_history_copy_item` only repeated the waits inside the helper.
- **PR description:** reworded the vitest mocking claim, the baseline case list and the red/green case names.

## Not acted on
- **Nested waits** in the switch test (`_wait_on(lambda: x.wait_for_text() == ...)`). `test_collection_edit.py` uses the same idiom, and there's no SmartTarget "wait until text equals" helper. Adding one is out of scope.
- **The new `data-history-id` hook is kept.** No existing attribute exposes the history id on a Multiview column or inside `HistoryPanel.vue`. I grepped `components/History/` to check.
- **`current_history_check` keeps its name,** even though it really selects the name display. A rename widens the diff and the drift against gxui (scope evaluation, option 5).
- **Selenium is still unrun locally** because there's no chromedriver. The new selectors are plain CSS, the helper uses the backend-neutral `drag_and_drop` (seletools for Selenium), and the waits are SmartTarget/`_wait_on`. `test_list_list_copy` already does a Selenium HTML5 drop onto a Vue `@drop.prevent` zone in CI. CI has to confirm it.
- **The base (26.2 vs 25.1)** was already decided in `scope_evaluation.md`, so I didn't revisit it.

## Verification
- Ran vitest under node 22.20.0:
  - The Baseline commit's test file against the base composable passes 4/4.
  - At head, it passes 7/7.
  - Against the base `&&`, the 3 fix-commit cases fail (dataset-only, collection-only, dataset-only "new history" box).
- `vue-tsc --noEmit` is clean, which confirms the `@ts-expect-error` is needed. eslint, prettier, ruff, ruff format and black are clean too.
- Ran Playwright headless on an isolated Galaxy (8082) behind Vite (5175), with a scratch config (`admin_api_key` only, each test registers a fresh user). The whole `test_history_multi_view.py` passed 6/6. The browser has to target Vite (`GALAXY_TEST_EXTERNAL=http://localhost:5175/`), because 8082 alone has no built client. Servers stopped afterwards.

<details><summary>Full review</summary>

**Multiview drag/drop semantics.**
- `&&` → `||` matches the intent of `c7423339250` ("if items were copied").
- `pinHistories` reaches the pin branch only through the "new history" box.
- `HistoryPanel.vue` columns pass only `historyIdComputed`, so they always reach `loadHistoryById(target)`.
- With pinned histories empty, the box now also calls `loadHistoryById(newId)`. That's a harmless reload of the history `createNewHistory` just made current.
- On a failed copy, the counts stay at 0 and the catch skips the refresh. This is covered.
- The description's "restores pre-Aug-2024 pinning" framing is accurate.

**Selectors and helper.**
- The column-scoped selectors are anchored on `.multi-history-panel .history-column[data-history-id]`. That's consistent with the existing `multi_history_panel` targets and the sibling `history_dropdown_menu` flat layout.
- The drop zone `.history-layout` is the element with `@drop.prevent` in `HistoryPanel.vue`, which is correct.
- `multi_history_copy_item` is a thin, reusable `NavigatesGalaxy` method. gxui consumes it.
- No new Python imports. Typing is consistent with neighbouring helpers.

**Vitest quality.**
- Follows the `createTestingPinia({ createSpy: vi.fn })` + `setActivePinia` pattern used by other composable tests (`rerunnableTool`, `useHistoryDatasets`). It uses stubbed actions, because the composable's store calls are its observable output.
- Only `@/api/datasets` and the toast are module-mocked.
- The tests check behaviour (which refresh happens, and for which history), not the literal code path. Before this review, the pin cases didn't exercise a real call shape.

**Baseline rule.** The baseline commit comes first and passes on base (4/4). The fix commit carries both the red/green vitest cases and the strengthened E2E assertion.

**E2E.** The tests use populators for setup, assert on rendered state plus the API, and wait on transitions. `screenshot` is called after the target column renders.

**Security.** None found.
</details>
