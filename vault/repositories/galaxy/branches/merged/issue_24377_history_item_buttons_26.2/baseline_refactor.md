# Baseline refactor (round 2)

I moved the GCollapse marker and the helper settle wait below the fix. The fix no longer adds an inline-style selector and a test-local wait that a later commit then deletes. The final tree is byte-identical to the old HEAD `ff9262c3655`, and the new HEAD is `379f1267d54`.

Round 1's "no refactoring" verdict no longer applies. When it was written, the branch was a single fix commit plus a polish commit. The re-scope added two infrastructure commits that each stand alone on the base, and both are safe there: with `_assert_buttons` still a stub, nothing on the base hovers inside an expanding item.

## New order (`origin/release_26.2..HEAD`)
1. **`218dcc649cf` Mark GCollapse once its open transition has ended.** Cherry-picked unchanged from `858f451e52e`. It adds a class and nothing visual, together with its vitest and the public-class registry entry.
2. **`a363bc72e26` Wait for history item bodies to finish expanding.**
   - Adds `content_item.details_expanded: '${_} > .g-collapse-shown'` and its `schema.ts` line.
   - Adds the wait in `history_panel_click_item_title(wait=True)`.
   - The commit message no longer mentions the inline-style selector or the test-local wait, because neither exists before this commit any more.
3. **`cfa65376cd9` Restore history item button tooltip checks** (`Fixes #24377`).
   - It is now limited to the `edit_button` and `info_button` selectors, `BUTTON_TOOLTIPS`, and the restored loop.
   - It has no `details_expanded` and no wait in `_assert_action_buttons`.
   - The GCollapse paragraph is gone from its message.
4. **`876f53c852c` Check history item buttons for discarded and deferred datasets.** Cherry-picked from `bad912a9769`.
5. **`5dbb553d129` Replace fixed sleeps in dbkey history state test with waits.** Cherry-picked from `db138499905`. Polish, moved above the fix.
6. **`379f1267d54` Drop trailing sleep from history dataset download check.** Cherry-picked from `ff9262c3655`. It depends on commit 2.

## Notes
- **Backup:** the local ref `issue_24377_history_item_buttons_26.2_pre_baseline_r2` points at `ff9262c3655`. Nothing was pushed, so the remote branch still has the old history.
- **Alt branch:** [alts/original_scope.md](alts/original_scope.md) says the alt (`db138499905`) is "the first two commits of the parent". That is no longer true, because the parent's commits have been reordered and rewritten. I corrected that line. The alt itself is unchanged.
- **Verification on the final HEAD:**
  - `git diff ff9262c3655 379f1267d54` is empty.
  - GCollapse and publicClasses vitest: 8/8 under node 22.20.0.
  - `test_history_dataset_state.py`: 4/4 under Playwright (102s).
  - `test_history_dataset_state.py` under Selenium: 4/4 (187s).
