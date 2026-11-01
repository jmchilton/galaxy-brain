# selenium_multiview_copy scope evaluation (re-harden, 2026-10-21)

**Recommendation: keep.** Ship the branch as re-scoped (head `4352a0f4ff6`, 6 commits on `release_26.2`): per-column Multiview hooks and selectors, `multi_history_copy_item`, two E2E tests, and the `historyDragDrop.ts` `&&` → `||` fix with its vitest and target-column E2E check. The first evaluation's expansion is done, and none of the follow-ups the re-harden raised clearly belongs here. Deleting the always-true guard behaves the same as `||` and is harder to review and cherry-pick. Reusing `copyHistoryItems` changes error semantics and adds concurrency. A SmartTarget "text equals" helper and nested or renamed column selectors are cross-cutting test-infra refactors with no bug behind them. A 25.1 backport is a cherry-pick after merge, not branch scope. Each is a fine follow-up on `dev`, or a separate 25.1 PR, and none is worth parking the branch over.

Branch size: 8 files, +177/−8. That's about 63 lines of product, selector and helper code, 46 lines of E2E and 114 lines of new vitest. No generated code.

## Possible Decompositions

For John to decide later. This is not a recommendation to split.

**Option A: two PRs, fix first.**
1. **Fix PR** (`release_26.2`, or `release_25.1` for a wider reach): `2b530b5fb65` Baseline tests, plus the `historyDragDrop.ts` operator and vitest cases from `4352a0f4ff6`. About 115 lines, self-contained, and easy to cherry-pick.
2. **Test-hooks PR** (on top of 1): `bb5ef3a54a3`, `bf260c4d28e`, `c6b0b9473cf`, `4eaf4afa350`, and the target-column E2E assertion from `4352a0f4ff6`. Its copy test only goes green once 1 has merged.

**Option B: two PRs, hooks first.** This is the original scope (`selenium_multiview_copy_alt_original_scope`) followed by the fix. The fix PR then carries the strengthened E2E assertion too. The hooks PR can merge on its own, but its copy test checks only the API until the fix lands.

**Option C: three PRs.** The dead-selector deletion `bb5ef3a54a3` goes first as a trivial cleanup, followed by A's two PRs. The deletion is only 4 lines, so this mostly adds review overhead.

## Scopes considered

### 1. As implemented: re-scoped branch (recommended)
Adds per-history column hooks (`data-history-id`, the switch button's `data-description`), repoints `switch_button`/`current_history_check`, drops `current_label`/`switch_history`, and adds `multi_history_copy_item` and two E2E tests. Also changes `&&` → `||` in `useHistoryDragDrop`, so single-type drops refresh the target column (and pin again from the "new history" box). A baseline-first vitest covers it.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the real bug the first column-to-column test exposed, and the E2E now checks the rendered column</li><li>Fully re-hardened: test challenge, E2E polish, Codex (no findings), thermo (no blockers), baseline refactor</li><li>The fix is one operator and cherry-picks cleanly to older releases</li><li>Two-way door</li></ul> | <ul><li>Fix reaches only 26.2+ unless backported</li><li>Mixes a product fix into a test-hooks PR (already framed in the description)</li><li>Selenium unrun locally, so CI has to confirm it</li></ul> |

### 2. Expand: delete the always-true refresh guard instead of `||`
Thermo showed that `datasetCount + collectionCount === dragItems.length > 0` once the guard is reached, so the `if` can go and the pin-or-load branch can run unconditionally.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes a guard that never fails</li><li>Slightly simpler code</li></ul> | <ul><li>Same behavior as `||`, so users see no difference</li><li>Reviewers have to check the invariant proof instead of a self-evident operator fix</li><li>Deletes the stated "if items were copied" intent, so a later edit that lets the loop skip items silently changes behavior</li><li>Worse cherry-pick story, and the PR text would need rewriting</li></ul> |

### 3. Expand: rebuild `onDrop` on `copyHistoryItems`
Replace the hand-built `{dataSource, type, id}` mapping and serial copy loop with `api/datasets.ts` `copyHistoryItems`.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes duplicated mapping, the counters and most of the toast branching</li><li>The kind of reuse Galaxy reviewers like</li></ul> | <ul><li>Changes failure semantics (it collects failed ids instead of aborting) and adds concurrency, which is new behavior on a release branch</li><li>Rewrites the toasts, the vitest and the failed-copy expectations</li><li>Unrelated to the refresh bug</li></ul> |

### 4. Expand: SmartTarget "wait for text equals" helper
Promote the test-local `_wait_for_text` into `smart_components.py`, plus the Playwright adapter, and make `test_collection_edit.py` its second caller.

| Pros | Cons |
| --- | --- |
| <ul><li>Real reusable abstraction with an existing second caller</li></ul> | <ul><li>Touches shared Selenium/Playwright infra on a release branch for a test convenience</li><li>No bug behind it, and the test-local helper already removes the duplication inside this file</li><li>Better on `dev`. Already a queued question for John</li></ul> |

### 5. Expand: nest the column selectors under `history_column` and rename them
Move the four `.history-column[data-history-id=…]` selectors under a `${_}` sub-component, and rename `current_history_check` → `name` and `switch_button` → `switch`.

| Pros | Cons |
| --- | --- |
| <ul><li>Tidier tree, and the misleading `current_history_check` name goes away</li></ul> | <ul><li>Flat layout matches the sibling `history_dropdown_menu`</li><li>Renames widen the diff and the drift against `galaxy_ui_driver`</li><li>Already weighed in the first evaluation (§5) and the polish debrief, and queued for John</li></ul> |

### 6. Expand: promote `test_list_list_copy`'s drop box to a navigation target
Replace the raw `div.history-picker-box.select-picker` with a `multi_history_panel` target. Optionally add an E2E check for pinning from the "new history" box, whose behavior the fix changes.

| Pros | Cons |
| --- | --- |
| <ul><li>Finishes the selector cleanup in this file</li><li>Would cover the pin side effect end to end</li></ul> | <ul><li>Pre-existing, working test</li><li>Pinned-Multiview setup in E2E is expensive. The vitest already covers the pin cases with the box's real call shape</li></ul> |

### 7. Re-target or backport to `release_25.1`
The bug has been on every release since 24.1 (#18699), and 25.1 is the oldest supported release.

| Pros | Cons |
| --- | --- |
| <ul><li>Reaches every supported release</li><li>Fits John's preference for older bases on simple fixes</li></ul> | <ul><li>The hooks, selectors and E2E aren't wanted on 25.1. gxui targets 26.2</li><li>Re-targeting means another rebase and re-harden, for a fix that cherry-picks cleanly (25.1 has the identical `&&` line at 166)</li><li>Best handled as a fix-only cherry-pick after merge (Decomposition A's first PR shape), not as branch scope</li></ul> |

### 8. Contract: back to the original scope
Ship `selenium_multiview_copy_alt_original_scope` (test hooks only), and fix `&&` separately.

| Pros | Cons |
| --- | --- |
| <ul><li>Pure test-hooks PR with a clean `kind/enhancement` framing</li></ul> | <ul><li>The copy test goes back to checking only the API, and the known bug stays in the flow the helper drives</li><li>Undoes a re-scope John already accepted, and needs two PRs</li></ul> |

<details>
<summary>Why not expand despite the process default</summary>

The default leans toward a modest expansion when torn. Here the evaluation isn't torn. The one expansion that fixed a related bug in touched code (the `||` fix) is already in. Every remaining candidate is either behavior-neutral (deleting the guard, the helper, the selector nesting), a semantic change unrelated to the bug (`copyHistoryItems`), or a base question better answered by a cherry-pick (25.1). None fixes another bug, and a further scope change would park the branch for John.

The thermo invariant was spot-checked at head. `operationDisabled` returns early on empty drag items, each item either maps or throws, and each `copyDataset` either increments a counter or throws into the catch. So the guard is indeed always true once reached. That makes deleting it a cleanup, not a fix.
</details>

## Follow-ups (not this branch)
- `dev`: rebuild `onDrop` on `copyHistoryItems` and drop the always-true guard in the same change.
- `dev`: add a SmartTarget "wait for text equals" helper, with the Multiview switch test and `test_collection_edit.py` as its first callers.
- After merge: if wanted, cherry-pick the `&&` → `||` fix (and its vitest) to `release_25.1`.
- Still queued for John: nesting and renaming the column selectors.
