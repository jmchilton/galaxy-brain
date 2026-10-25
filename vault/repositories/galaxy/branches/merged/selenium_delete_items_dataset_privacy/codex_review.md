# Codex review

Codex (read-only, `origin/release_26.2...033fe764740`, re-scoped branch) raised one P2, which I acted on.

- **Optimistic hide ignored matching sub_items** (`HistoryPanel.vue` `hideIfFilteredOut`). The store keeps a row when the parent or any converted `sub_item` passes the filters, but the panel tested only the parent. Example: with `extension:bam` and Include deleted, deleting a SAM whose BAM conversion matches hid the row. This isn't a regression, because the old code always hid, but the two predicates had diverged. Fixed with `itemPassesFilters(filters, item)` in `HistoryFilters.js`, now used by both `historyItemsStore.getHistoryItems` and `hideIfFilteredOut`. Folded into the fix commit. History and stores vitests pass (80 files, 683 tests); eslint and prettier are clean.

The pre-rescope Codex review (config-guard P2s, not acted on) is in `earlier_drafts/1/codex_review.md`.

<details><summary>Raw finding</summary>

P2 `client/src/components/History/CurrentHistory/HistoryPanel.vue:355`, "The optimistic hide check ignores matching converted sub-items". Codex: "Extract and reuse the parent-or-sub-item predicate so both paths apply the same logic." Failure scenario: a SAM dataset with a BAM conversion under the same HID. Search `extension:bam` with Include deleted on, then delete the parent: the row disappears until a store refresh. Confidence: certain. Coverage: all changed files; static review only.

</details>
