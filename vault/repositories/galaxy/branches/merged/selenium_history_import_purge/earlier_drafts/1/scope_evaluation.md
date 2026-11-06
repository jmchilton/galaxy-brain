# Scope evaluation: selenium_history_import_purge

**Recommendation: expand (modest).** Keep both tests, but move the new copy-modal selectors out of `history_view.copy_modal` into one shared copy-history-modal component (replacing the stale, unused `multi_history_panel.copy_history_modal` `.modal-dialog` entry) so every `CopyModal.vue` mount (history view import, history options "Copy this history") drives through the same selectors and helper. That deletes a broken selector in touched code, makes the new `data-description` hooks reusable, and matches the direction already taken on `galaxy_ui_driver` (gxui uses `history_panel.copy_history_modal`), which removes restack churn. Optionally add a UI assertion that the histories list empties after purge. No further expansion warranted; branch is ~68 lines, so no decomposition section.

## As implemented

Two E2E tests on `release_26.2`: import another user's shared history from `/histories/view`, and bulk purge all histories from the histories list. Adds `data-description` hooks on `CopyModal.vue`, selectors under `history_view.copy_modal` / `histories.{bulk_purge_button,select_all}`, and three `NavigatesGalaxy` helpers.

| Pros | Cons |
|---|---|
| - Tiny, additive, reviewed clean (normal, codex, thermo-nuclear)<br>- Assertions check server state<br>- Fits "missing tests are bugs" release target | - Copy modal selectors scoped to `history_view` though `CopyModal` is shared<br>- Leaves broken `multi_history_panel.copy_history_modal` (`.modal-dialog`, no longer matches GModal) beside the new working one<br>- Diverges from gxui's `history_panel.copy_history_modal`; restack must rename |

## Expand A (recommended): shared copy-history-modal component

Hoist `copy_modal` selectors to a shared component (e.g. replace `multi_history_panel.copy_history_modal` or add `history_panel.copy_history_modal` matching gxui), split `history_view_import` into click-import + a reusable `history_copy_modal_submit(new_name=None)` helper. Optionally exercise it once from history options "Copy this history" if no E2E covers that.

| Pros | Cons |
|---|---|
| - Removes a dead/broken selector in touched area<br>- One reusable abstraction for all CopyModal mounts<br>- Aligns with gxui; cleaner restack<br>- Still a few lines | - Touches `schema.ts` regen for removed key<br>- Must keep `dialog[open]` scoping (several CopyModals mounted) |

<details>
`multi_history_panel.copy_history_modal` is only referenced in generated `client/src/utils/navigation/schema.ts`; no Python caller. The initial debrief explicitly left it "out of scope" - the scope process overrides that for related cleanup in touched code. Check gxui's exact key name before choosing, so the restack drops cleanly.
</details>

## Expand B: purge test also asserts list UI

After purge, assert the histories list shows no "purge me" rows (test challenge noted it as optional).

| Pros | Cons |
|---|---|
| - Covers the user-visible result, not just API | - Backend poll already strong; minor value |

## Expand C: broader bulk-ops / shared `ListHeader` select-all

Dedupe `select_all` with other `ListHeader` selectors, cover more bulk ops.

| Pros | Cons |
|---|---|
| - Wider reuse | - Bulk delete/restore already tested (`test_histories_list.py`); dedupe is cross-component churn, deferred by normal and thermo reviews. Not recommended |

## Contract: drop one test

Ship only import or only purge.

| Pros | Cons |
|---|---|
| - Smaller | - Both are independent uncovered flows at ~10 lines each; no reason to split. Not recommended |
