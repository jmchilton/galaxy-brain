# Initial implementation debrief

```
created .../differential-review/snapshots/20261028T150735Z-implementation-504da7d318b2.json
  implementation @ 504da7d318b2 vs origin/release_26.2 (merge-base b7f7834d94a4)
  first snapshot: 3 commits, 7 files, 9 hunks
```

The base is `release_26.2`. The bug started there: the edit button became a GButton under the vGTooltip directive, which skips disabled elements. Commit 7db6679d6aa, which keeps hover working on disabled GButtons, is an ancestor of the base.

Commits:
1. **Baseline tests:** `ContentOptions.test.ts` covers the edit button's `aria-disabled` state and click/emit for the 6 not-editable states and for `ok`.
2. **Fix:** in `ContentOptions.vue` the edit button uses `tooltip` + `title` + `disabled-title` (the existing GButton pattern), and the `editButtonTitle` computed is gone. A red-then-green vitest checks that the button's `aria-describedby` GTooltip holds the right text. `get_tooltip_text` follows `aria-describedby` to a GTooltip (class token `g-tooltip`, not `g-tooltip-d`) and waits for `data-show="true"`. `test_history_dataset_state.py::test_dataset_state_discarded` hovers the disabled title again.
3. **Audit:** `HistoryNavigation.vue` (create and switch buttons), `MultiviewPanel.vue` (create) and `WorkflowPublishedButtons.vue` (edit) now use the `tooltip` prop. Their titles already change with state ("Log in to …", "Restore it first").

Skipped audit sites:
- Bulk-delete loading titles in `DatasetList`, `WorkflowList` and `HistoryList`. These are transient states.
- `GCard` actions, whose titles come from callers. `GCard:702` never renders disabled anyway.
- `EditableUrl`.

Tests:
- History, Panels and Workflow vitests: 1054 pass.
- Playwright run of `test_history_dataset_state.py`, after fixing the helper (Vue drops `data-show=false`, so the first guard missed GTooltip): 3 pass, and `test_dataset_change_dbkey` fails before any tooltip step. The apiMel3 dbkey option is missing on the local server. This is likely environmental and wasn't checked on the base.
- Selenium backend not run: no driver or virtual display on this machine.
