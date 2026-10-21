# selenium_multiview_copy scope evaluation (2026-10-20)

**Recommendation: expand.** Fold the `historyDragDrop.ts` `&&` → `||` fix (from `c7423339250`) into this branch as its own commit, and use the target-column assertion the test challenge already proved red/green (`history_column_item(history_id=target, hid=1).wait_for_visible()`) to make `test_copy_dataset_between_columns` its regression test. The bug is in the exact flow this branch adds a helper for, and the only natural regression test for it needs this branch's per-column hooks. The upstream plan's coverage PRs on `release_26.2` are meant to "bring the fixes [their] test needs", and the process default is to expand when torn. The strongest case against expanding is the base: the bug has been on every release since `release_24.1` (#18699), so under the one-year rule the oldest supported base is `release_25.1`, and John prefers older bases for one-line fixes. A 25.1 fix would need a new test vehicle, though, because `historyDragDrop.ts` has no vitest file and 25.1 has no per-column E2E hooks. The fix can still be cherry-picked to 25.1 later if anyone asks. Every other scope considered (selector follow-ups, a contraction) should stay out.

Branch size: 6 files, +61/−7, about 68 lines of non-generated code. That's under 100, so there's no decompositions section.

## Facts behind the call

- **Origin.** `c7423339250` ("only load/pin history if items were copied", Ahmed Awan, 2024-08-28) arrived through #18699 (`drag_drop_DCE`) on `release_24.1`. It's on `release_24.1`, 24.2, 25.0, 25.1, 26.0, 26.1, 26.2 and `dev` (line 166, unchanged on `origin/dev` `2cca8565861`).
- **Supported bases.** v25.0.0 was released 2025-06-18, so it's out of support. v25.1.0 was released 2025-12-12, so it's in. That makes `release_25.1` the oldest supported base with the bug.
- **Before the regression,** pin/load ran after every drop, with no count check. The commit was meant to skip the refresh when nothing was copied (count 0). `&&` instead skips it unless the drop mixed datasets *and* collections.
- **The pin side effect is a restoration of old behavior.** Only `MultipleViewList.vue` passes `pinHistories=true`, through `useHistoryDragDrop(undefined, true, true)` on the "new history" drop box. Multiview columns use `HistoryPanel.vue`, which passes no flag and so only reaches `loadHistoryById`. With `||`, a dataset-only or collection-only drop onto the new-history box pins the new history and the source history again when histories are pinned, which is what happened before Aug 2024. Under `&&` the new history isn't pinned, so it can be missing from a pinned Multiview, which is worse than a stale column.
- **Existing test masks it.** `test_list_list_copy` drops a collection only onto the new-history box and checks just the current history id and the API contents, so it passes under `&&`.
- **No duplicates.** GitHub searches turned up no open PR or issue about this bug.

## Scopes considered

### 1. As implemented
Adds per-history Multiview hooks, repoints `switch_button` and `current_history_check`, drops `current_label` and `switch_history`, adds `multi_history_copy_item`, and adds two E2E tests. It doesn't touch the product code.

| Pros | Cons |
| --- | --- |
| <ul><li>Pure test hooks, an easy two-way door</li><li>Already hardened: polish, test challenge, E2E polish, Codex, baseline refactor</li><li>Clean `kind/enhancement` framing</li></ul> | <ul><li>The copy test can only check through the API, because the UI result it would check is broken</li><li>Leaves a known, reproduced bug in the flow it adds a helper for</li><li>The E2E polish deliberately skipped the after-drop screenshot because it would picture the bug</li></ul> |

### 2. Expand: `||` fix plus target-column assertion (recommended)
Add a commit changing `historyDragDrop.ts:166` to `datasetCount > 0 || collectionCount > 0`. Strengthen `test_copy_dataset_between_columns` to wait for the copied item in the target column, and optionally take an after-drop screenshot. A vitest for the composable is optional and would make a later 25.1 cherry-pick self-contained.

| Pros | Cons |
| --- | --- |
| <ul><li>One-line fix with a red/green E2E already shown (failed twice under `&&`, passed under `||`)</li><li>Matches the upstream plan's coverage-PR rule and the process default</li><li>The copy test then checks what a user sees, not just the API</li><li>Also fixes the new-history box not pinning on single-type drops</li></ul> | <ul><li>Fix lands on 26.2+ only, not 25.1/26.0/26.1, unless cherry-picked</li><li>PR mixes a product fix into a test-hooks PR, so the title, description and tags need a `kind/bug` angle</li><li>Behavior change on the pin path, which the description should explain as restoring pre-2024 behavior</li><li>Needs an E2E rerun (and ideally Selenium, though there's no local chromedriver)</li></ul> |

<details>
<summary>Commit order if expanded</summary>

Put the fix commit after the hooks commit. The strengthened assertion can join the copy-test commit, or go in its own commit after the fix, so the copy test stays green at every commit. It isn't a baseline-test candidate: the assertion fails on base.
</details>

### 3. Separate fix branch on `release_25.1`
A new `historyDragDrop.ts` fix branch on the oldest supported base, with its own test. This branch would add the column assertion once the fix merges forward to 26.2.

| Pros | Cons |
| --- | --- |
| <ul><li>Reaches every supported release</li><li>Fits John's preference for older bases on simple fixes</li><li>Keeps this PR a pure test-hooks PR</li></ul> | <ul><li>No test vehicle on 25.1: no per-column hooks there, and no vitest file for `historyDragDrop.ts` to extend. It would need a new composable vitest (mocking `copyDataset` and the history store) or an E2E through the new-history box with pinned histories</li><li>Two PRs and a merge-forward wait before this branch can assert the UI result</li><li>The 25.1 test would be new scaffolding that only this bug motivates</li></ul> |

### 4. Promote `test_list_list_copy`'s drop box to a `multi_history_panel` target
Replace the raw `div.history-picker-box.select-picker` with a navigation target.

| Pros | Cons |
| --- | --- |
| <ul><li>Finishes the selector cleanup in this file</li><li>Small</li></ul> | <ul><li>The test predates this branch and works</li><li>A refactor with no bug behind it, which adds churn to a release-branch PR</li></ul> |

### 5. Nest the column selectors as a `history_column` sub-component and rename them
Rename `switch_button` → `switch` and `current_history_check` → `name`, under a `multi_history_panel.history_column` sub-component (the polish question).

| Pros | Cons |
| --- | --- |
| <ul><li>Tidier navigation tree</li></ul> | <ul><li>The flat layout matches the sibling `history_dropdown_menu`</li><li>Renames widen the diff and the drift against `galaxy_ui_driver`</li></ul> |

### 6. Drop or fix `empty_message_check`
It has no caller but still matches something.

| Pros | Cons |
| --- | --- |
| <ul><li>One less unused selector</li></ul> | <ul><li>Not broken, and someone (or gxui) may use it</li><li>Not worth the churn</li></ul> |

### 7. Contract: ship only `d07da10cad7` (drop the dead selectors)
Just the four-line deletion. The hooks, helper and tests would go to dev or to gxui.

| Pros | Cons |
| --- | --- |
| <ul><li>Smallest possible release-branch change</li></ul> | <ul><li>Defeats the purpose: gxui needs column-to-column copy on 26.2, and the upstream plan wants E2E coverage to come with the hooks</li><li>`switch_button` and `current_history_check` stay dead</li></ul> |

## Related context: `galaxy_ui_driver`

- The branch was pulled out of `galaxy_ui_driver` (4c and 5e) under `vault/projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md`. That plan puts gxui on `release_26.2` for 26.2 QA, and asks each coverage PR to carry the fixes its test needs.
- gxui uses `multi_history_copy_item` to copy items between histories from scripts. It checks results through the API, so the bug doesn't break it, but someone watching a driven session sees a stale target column.
- Expanding doesn't change the restack plan: gxui drops 4c/5e once this merges to 26.2, and the fix commit simply rides along.
