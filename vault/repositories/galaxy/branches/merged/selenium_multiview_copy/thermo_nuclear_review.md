# Thermo-nuclear code quality review (re-harden, 2026-10-21)

I ran the thermo-nuclear review against `git diff origin/release_26.2...HEAD` at head `4352a0f4ff6` (8 files, +177/-8), scaled to a roughly 160-line release-branch fix. It found **no structural blockers**. Nothing was acted on. Code, head, commits and `pr_description.md` are unchanged, and nothing was pushed.

## Not acted on
- **The `onDrop` refresh guard is always true. Deleting it would be the code-judo move.** Kept as the `||` fix because a one-operator change is easier to review on a release branch and states c7423339250's intent. It's a follow-up for dev, together with `copyHistoryItems` reuse (below).
- **Selector naming and nesting.** Four `navigation.yml` selectors repeat the `.history-column[data-history-id=…]` prefix, and `current_history_check` reads a column's name rather than checking which history is current. Nesting them as a `history_column` sub-component (`_` / `${_}`) and renaming them was already weighed in `polish_debrief.md` and `earlier_drafts/1/scope_evaluation.md` §5. They were kept flat to match the sibling `history_dropdown_menu`, and that question is already queued for John. Not raised again.
- **`copyHistoryItems` reuse.** It's a duplicate mapping in the composable, but switching would change error semantics and add concurrency. It's already a follow-up in `test_challenges_debrief.md`.
- **Test-local `_wait_for_text`.** It's already a SmartTarget "text equals" follow-up in `polish_e2e_tests_debrief.md`.
- **Casts in the vitest file** (`as never` on the MSW response, the `ReturnType` cast in `setUp`, and `@ts-expect-error` on the writable getter). They sit only at the test boundary and are justified there. Not a blocker.

## Verification
- `historyDragDrop.test.ts`: **6/6 pass** (node 22.20.0 via `npm_config_use_node_version`).
- E2E wasn't rerun because no code changed. The last Playwright run on the identical head `4352a0f4ff6` passed `test_history_multi_view.py` 6/6 (see `polish_e2e_tests_debrief.md`).

<details>
<summary>Full review</summary>

**Approval bar: met.** There is no structural regression, no file crosses 1k lines, no special-case branches were added, the change is in the canonical layers, and there is no wrapper, cast or optional-parameter churn in product code.

### 1. Structural and code-judo: the `onDrop` guard is always true
`historyDragDrop.ts`: `if (datasetCount > 0 || collectionCount > 0)` cannot be false once execution reaches it:
- `operationDisabled` returns early when `getDragItems()` is empty.
- Every drag item either becomes a `HistoryItemCopyData` or throws (`Invalid item type`).
- Every `copyDataset` either succeeds and increments a counter, or throws into the catch.

So after the loop, `datasetCount + collectionCount === dragItems.length > 0`. The bug (`&&`) was really a misstatement of a guard that wasn't needed. The simplest version deletes the `if` and keeps the pin-or-load branch.

**Why it wasn't done here:** `||` behaves identically, keeps the "if items were copied" intent readable, and leaves the PR as a one-operator fix that is easy to cherry-pick to older releases. Deleting the guard would make reviewers check the proof above and would mean rewriting the PR text for no change in behavior. Better done on dev, together with the next item.

### 2. Reuse: the composable duplicates `api/datasets.ts` mapping
`onDrop` builds `{dataSource, type, id}` by hand and copies serially. `copyHistoryItems` already copies in batches with `allSettled`. Consolidating them would remove the counters, the hand-built copy items and most of the toast branching. It changes failure semantics (it collects failed ids instead of aborting) and adds concurrency, so it's dev work, not a `release_26.2` fix. Already recorded in the test challenge.

### 3. Boundary and type
- Product code adds no casts or optionality. `data-history-id` is on the column wrapper `MultipleViewList.vue` already iterates, which is the right owner. `data-description` on the switch button follows Galaxy's hook convention.
- Vitest: `setUp(dragItems: object[])` plus the `ReturnType<typeof eventStore.getDragItems>` cast, `as never` on the MSW body, and `@ts-expect-error` for the getter `createTestingPinia` makes writable. These are minimal-fixture shortcuts at the test boundary and don't leak. Typed fixtures would add noise without making things clearer.

### 4. Selectors (`navigation.yml` / `schema.ts`)
- The prefix `.multi-history-panel .history-column[data-history-id="${history_id}"]` repeats 4×. `SelectorTemplate` supports `_` / `${_}` children, so a nested `history_column` component is possible (as `content_item` does with `${_} .name`). The sibling `history_dropdown_menu` is flat, and so is the existing `item` key. Flat is defensible. Already decided and queued (polish debrief, scope evaluation §5).
- `current_history_check` is a misleading name for "this column's name display" (the switch test binds it to `target_name`). It's a pre-existing key, and renaming it is the same queued question.
- Dropping the dead `current_label` / `switch_history` keys is correct deletion.

### 5. File size
- `navigates_galaxy.py`: 3360 lines before this branch. +7 lines doesn't cross a threshold, and the helper sits next to `open_history_multi_view` and `history_multi_view_display_collection_contents`, which is the canonical home.
- `test_history_multi_view.py`: 163 lines. `historyDragDrop.ts` +0 net. New vitest file 114 lines.

### 6. Spaghetti and branching
None added. The only product logic change is the operator. The E2E helpers are test-local (`_wait_for_switch_button_labels`, `_wait_for_text`) or a single-purpose `NavigatesGalaxy` method built on existing `drag_and_drop` and SmartTargets.

### 7. Legibility (minor, not raised)
- `multi_history_copy_item(hid, from_history_id, to_history_id)` reads well, and its docstring is one line.
- The `setUp` / `setUpNewHistoryBoxDrop` vitest helpers are small and named after the call shapes they model.

</details>
