# Re-scope normal review debrief

The review of `5857b17da80` (ListWizard) said ship it, with no bugs. I made two changes: `history_panel_build_list_advanced` gets the same `scope` keyword as `_auto`, and the wizard's success alert now reads "Collection created and added to the history it was built from." The previous text said "your history", which was misleading when building from a view page. Both were folded in, and the commit is now `469a571f614`. The E2E still passes under Playwright.

What I didn't act on, and why:
- **`#center` → `navigation._.selectors.center_panel`:** `history_element` scopes are plain strings everywhere, including the `.history-index` default, so I matched the file's style.
- **Unscoped `history_panel_multi_operations_show`:** it works because the center panel comes first in the DOM. Scoping it would need a `${scope}` selector template; noted as possible follow-up.
- **No E2E for the wizard's paired and rules paths:** each is a one-line getter that `useCollectionCreation.test.ts` already covers.
- **Getter type widening:** cosmetic.
- **SampleSheet callers of `useCollectionCreation()`:** they have no known user-visible bug; possible follow-up.
- **PR body:** list the third behavior change, "Auto/Advanced Build List from an owned non-current history's view page now builds in that history". This is for the polish agent.

<details><summary>Full review</summary>

**Verdict:** ship it, no real bugs. The commit reuses the branch's `useCollectionCreation(historyId)` getter, and the helper defaults keep existing callers working.

**Checked:**
- `SelectionOperations.listWizard` is the only `setSelectedItems` caller. It sets the history id and the selected items together, so the store stays self-consistent.
- The route reads only `?advanced`.
- After a reload the store is empty, the guard falls through, and the "Select datasets" alert shows.
- A history you don't own can't be selected (`selectable: canEditHistory`).
- The Selection menu is hidden in multiview.
- The rules path is covered through `createPayload`.
- The template guard narrows `historyId`, and `vue-tsc` is clean.
- Breadcrumbs now agree with where the list is built.
- The helper defaults keep the 18 existing call sites unchanged.
- Item selectors are `#dataset-<id>`, which are unique across panels.
- The test fails without the fix, asserts both histories, and runs under both backends.

**Nits:**
1. `#center` literal.
2. `_advanced` scope symmetry (done).
3. Unscoped multi-ops show button.
4. Paired and rules paths aren't covered end to end.
5. Getter fallback typing.
6. Alert wording (done).
7. PR body should list the third behavior change.

**Abstraction:** good reuse. `useCollectionCreation(getter)` is now the single place that picks the target history. SampleSheet is a follow-up.
</details>
