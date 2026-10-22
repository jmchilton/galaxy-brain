# Implementation debrief

**STATUS: BLOCKED** on a scope decision. The second scope evaluation recommends a small expansion, and the process parks the branch rather than re-scoping twice. The branch is otherwise ready: head `b2722375165` on `release_26.2`, pushed to `jmchilton`.

## What it is

The work started as two FAQ-loop E2E tests pulled out of `galaxy_ui_driver` (`d0d92741f74` delete/undelete/purge, `ea0bc576e38` Make new datasets private). Hardening them found a HistoryPanel bug: with Include deleted (or hidden) on, an undeleted, deleted or unhidden item vanished from the list until the filter changed. The first scope evaluation said to fix it here, so the branch was re-scoped. The test-only version is `selenium_delete_items_dataset_privacy_alt_original_scope`.

Five commits:
1. Baseline tests for the privacy preference, plus client test hooks.
2. The `history_panel_item_delete` helper.
3. A pure refactor: `getClientFilters`/`itemPassesFilters` shared by the store and the panel.
4. The fix, with a vitest that fails 3 cases before it.
5. The delete/undelete/purge/unhide E2E.

## Decisions

- **Dropped `53ab472b46d`** (the auto-detect helper). Only gxui motivates it, and it conflicts with #24347.
- **Kept the vitest** after test challenges removed it. It is the fix's only demonstrated red, and `HistoryView.test.js` already mounts this tree.
- **Acted on Codex's sub_items finding.** The panel's hide check and the store now share one predicate.
- **Not acted on:**
  - Config guards for externally configured servers.
  - The default-on switch assert stays: it pins 26.2's new default.
  - The `history_panel_include_deleted` name stays, because gxui backs onto it.

## Validation

- **E2E:** `test_delete_undelete_and_purge_items`, `test_unhide_item_with_include_hidden`, `test_new_datasets_private_switch` and `test_rerun_deleted_dataset` are green under Playwright and Selenium.
- **Vitest:** History and stores suites pass (683 tests).
- **Lint:** eslint, prettier, vue-tsc and pre-commit are clean.
- **Merges:** clean with all queued 26.2 selenium siblings.
- **Screenshots:** 7, in `screenshots/`.

## Decision needed (John)

1. **Second-scope expansion.** `onUndelete`/`onUnhide` lack the `catch` that `onDelete` has. On a failed request under deleted-only or hidden-only filters, the row stays hidden with no error. The fix is about 8 lines plus a vitest case, through an `updateItem` helper. The bug predates this branch and only shows on failure; shipping as is is a sound fallback.
2. **Base for the fix.** The bug is on 26.0 through dev. The privacy test can't leave 26.2, because the private-by-default flag is false on 26.0/26.1. Options: one 26.2 PR as is, or split the fix onto 26.0. The vitest needs a Vue 2 port there, and `HistoryFilters.js` has a trivial conflict.
3. Optional: commit the post-Undelete screenshot the screenshot pass took ad hoc.

Debriefs: `initial_implementation_debrief.md`, `implementation_rescope_debrief.md`, `test_challenges_debrief.md`, `polish_e2e_tests_debrief.md`, `codex_review.md`, `thermo_nuclear_review.md`, `baseline_refactor.md`, `scope_evaluation.md`, `screenshot_debrief.md`, `subagents/`. Pre-rescope hardening is in `earlier_drafts/1/`.
