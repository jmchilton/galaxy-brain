# Thermo-nuclear code quality review (re-harden after re-scope)

Nothing acted on; no code changed. The approval bar is met. The re-scoped client fix is small, uses the store's own predicate, and adds no special-case branches. The test side was cleared in `earlier_drafts/1/thermo_nuclear_review.md` and is unchanged apart from the new unhide test and the 4th dataset, which follow the same patterns. Reviewed at `864f139b58f`.

Not acted on:
- **`onUndelete`/`onUnhide` write their change literal twice**, once for `hideIfFilteredOut` and once as the `updateContentFields` body. A shared `updateItem(item, change)` would make the two agree by construction. `onDelete` doesn't fit it (`deleteContent`, catch), and the 26.2 fix stays minimal. Dev follow-up.
- **`getClientFilters`/`itemPassesFilters` are untyped** because `HistoryFilters.js` is JS, so TS callers get `any`. Converting the file is out of scope for 26.2.
- **Vitest `if (operation === "delete")` branch.** The delete emit needs `target.props("item")`, so moving emit args into the `it.each` table would be clumsier than the branch.
- **`selectedItems.ts` `isSelected` uses `testFilters` without the sub_items rule.** It is a generic composable shared with other lists, and it decides selection, not visibility. Not the same predicate, so not a reuse miss.
- **Removing the optimistic hide entirely** (relying on the store merge) would delete `hideIfFilteredOut`. But under the default filter, items would linger until the request returns, which is a UX change. Not for 26.2.
- Settled items not revisited: the `muli` spelling, the `history_panel_include_deleted` name, the default-on switch assert, no config guards, and the vitest staying in `HistoryView.test.js`.

## Tests

No code changed, so earlier greens still apply (`polish_e2e_tests_debrief.md`, `codex_review.md`). The final tree after `baseline_refactor.md` is byte-identical to `864f139b58f`.

<details><summary>Full review</summary>

## Verdict

Approve. The diff is 11 files, +269/-23. No file crosses 1k lines: `HistoryPanel.vue` is 605, `HistoryFilters.js` 117, `historyItemsStore.ts` 121. `navigates_galaxy.py` is pre-existing debt and was covered last round.

## 1. Structure of the fix

The root cause is that under `deleted:any`/`visible:any` the store computed never reads the changed field, and `mergeArray` updates in place. So the `historyItems` watcher never fires to undo `setInvisible`. The fix doesn't patch the watcher or the store. It stops hiding items that the current filter would keep, using the same predicate as the store (`itemPassesFilters(getClientFilters(...))`). Three one-line call-site swaps and one 5-line helper. I looked for code judo:
- Making the store computed always read `deleted`/`visible` would be magic dependency tracking.
- A deep watch walks every item on every change, and can flicker.
- Snapshotting state at hide time adds a state model.

None of these is simpler than the current approach.

## 2. Canonical layer and reuse

The "filters minus `related`" logic and the parent-or-sub_item rule now live in `HistoryFilters.js`, next to the `HistoryFilters` instance that owns them. The store and the panel share them, so the two predicates can't drift (Codex's P2). The extraction is behavior-neutral. `Boolean(item.sub_items?.some(...))` matches the old `!item.sub_items || !...some` for undefined and empty arrays.

## 3. Spaghetti

No new conditionals in shared flows. `hideIfFilteredOut` replaces an unconditional `setInvisible`. `onDelete`'s catch still clears the flag, which is a no-op when nothing was hidden. `onHideSelection` is untouched.

## 4. Types and boundaries

`change: Partial<HistoryItemSummary>` is explicit. The JS exports are untyped (see above). `invisibleHistoryItems: Record<string, any>` is pre-existing.

## 5. Tests

The vitest `it.each` covers 3 kept and 2 hidden cases through the real HistoryCounter buttons, the store and ContentItem emits. The kept cases are red on the pre-fix panel (confirmed in `subagents/rescope_review_debrief.md`, and again at the extraction commit in `baseline_refactor.md`). The `overrides` params on `create_datasets`/`createWrapper` are minimal scaffolding.

</details>
