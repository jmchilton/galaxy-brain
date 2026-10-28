# Scope evaluation

**Recommendation: expand (modestly).** Generalize the cleanup helper to `storage_dashboard_cleanup(operation, screenshot_prefix=None)` and keep `storage_dashboard_purge_deleted_datasets` as a one-line wrapper over it, so gxui's name binding survives. Then add E2E for the other two Free up disk space operations, `deleted_histories` and `archived_histories`. All three operations share one `CleanupOperationSummary` card and one `ReviewCleanupDialog`/`CleanupResultDialog`, and the branch's `storage_dashboard.cleanup` selectors already take `${operation}`. Neither history operation has E2E today (no hits for `deleted_histories`/`archived_histories` in `lib/galaxy_test/selenium/`). Keep the Resume Paused Jobs half as is. It is the only UI entry point to resume, and the paused-state message in `states.ts` points users to it.

The normal and thermo-nuclear reviews both deferred this generalization, for two reasons. The first was the gxui name binding, which the wrapper solves. The second was "a generic helper claims coverage nobody ran", which testing the other operations solves. "Build the reusable piece now" is one of the narrowness reasons John has overridden before. There's no upstream drift: `origin/release_26.2` has no new commits on the touched paths since `5a8f781d0ea`.

## Possible Decompositions

The branch is +100/-5 over 6 files, right at the threshold. Its 3 commits already map onto separable pieces:

1. **`navigate_to_storage_dashboard` refactor** (`cdf468d38c8`). The helper, plus `test_history_storage_accessibility` switched to it. Standalone, lands first or with 3.
2. **Resume Paused Jobs** (`46e355f7534`). The `data-description="resume paused jobs"` hook, `click_history_option_resume_paused_jobs` and `test_resume_paused_job`. Independent of 1 and 3.
3. **Storage Dashboard cleanup** (`ed05d842b20`, plus the expansion if taken). The card `data-description`, the `storage_dashboard.cleanup` selectors, the purge helper (or the generic helper plus its wrapper) and the test(s). Depends on 1.

Under the expansion, 3 could split again: 3a is the deleted datasets purge as implemented, and 3b is the generic helper plus the history-operation tests. Ordering options: (a) one PR, as now; (b) 1+3 as a "Storage Dashboard cleanup E2E" PR and 2 as its own "Resume Paused Jobs E2E" PR; (c) three PRs, 1 → 3, with 2 in parallel.

## Scope: as implemented

E2E for History options > Resume Paused Jobs (with the input undeleted through the API) and for Storage Dashboard > Free up disk space > Deleted datasets purge. Adds two `data-description` client hooks, `storage_dashboard.cleanup` selectors, two helpers and a `navigate_to_storage_dashboard` refactor.

| Pros | Cons |
|---|---|
| <ul><li>Small and green on both backends; through normal, codex, thermo-nuclear and test-challenge review</li><li>Independent of #24380 (API undelete)</li><li>The helper names match gxui's verb bindings, so restacking is simple</li></ul> | <ul><li>The selectors are modeled per operation, but the helper hardcodes `deleted_datasets` and the test repeats the literal</li><li>2 of the 3 cleanup operations behind the same dialog are still untested</li><li>Reviewers have flagged the generalization twice and deferred it twice</li></ul> |

## Scope: generic cleanup helper plus the history cleanup operations (recommended)

`storage_dashboard_cleanup(operation, screenshot_prefix=None)` carries the current body with the operation parameterized, and `storage_dashboard_purge_deleted_datasets` calls it with `"deleted_datasets"`. Adds `test_purge_deleted_histories_from_storage_dashboard` and `test_purge_archived_histories_from_storage_dashboard` (or one test per operation, parameterized): a fresh user, a history deleted or archived through the API, then a purge through the dashboard, an assert that it's purged, and a wait for `no_items`.

| Pros | Cons |
|---|---|
| <ul><li>Lines the helper up with the operation-scoped selectors and removes the duplicated literal</li><li>Covers all three cleanup operations and the history-side `cleanupHistories` path, including `_unarchive_if_needed` for archived histories</li><li>Setup is cheap: `dataset_populator.delete_history` and `archive_history` (no export record needed) already exist</li><li>The wrapper keeps gxui's binding, so there's no cross-branch change</li><li>No new client hooks: the card hook and the dialog-wide selectors already cover the history operations</li></ul> | <ul><li>About 2 more E2E tests (roughly 30–40s each, on both backends) on a branch that has already seen Selenium hangs under load</li><li>Not yet run. History rows and the archived summary need a first run to confirm the shared selectors hold</li><li>A small drift from the `galaxy_ui_driver` commits, which need dropping by subject on restack anyway</li></ul> |

<details><summary>Details</summary>

- `categories.ts` lists `deleted_datasets`, `deleted_histories` and `archived_histories`. Each renders through `CleanupOperationSummary`, whose `review-link` / `no-items-indicator` depend only on `summary.totalItems`. So a deleted or archived history shows the review link even if its `disk_size` is 0.
- Server side, `HistoryStorageCleanerManager.get_discarded` filters `deleted & !purged`, and `get_archived` filters `archived & !purged`. `cleanup_items` unarchives with `force=True`, then purges. `HistoryManager.archive_history` accepts `archive_export_id=None`, so `archive_history(history_id)` with no export record is enough.
- `ReviewCleanupDialog` uses the same `review-table`, `select-all-checkbox`, `delete-button` and `agreement-checkbox` for every operation, so `select_all`, `delete_button_enabled`, `agreement`, `confirm_enabled` and `success` should work unchanged.
- Each test should register a fresh user, like the datasets test does: the shared Selenium user accumulates deleted and archived histories, and the current history must not be the one deleted.
- The `screenshot_prefix` convention carries over unchanged.

</details>

## Scope: driver-level enabled wait that honors `g-disabled`

Add a general `wait_for_enabled` (or teach the clickable wait to respect `g-disabled`/`aria-disabled`) in the selenium/playwright driver layer, replacing the per-selector `:not(.g-disabled)` entries. The thermo-nuclear review raised this as a follow-up.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a real Selenium-side gap for every GButton, not just these two</li><li>Removes the `*_enabled` selector variants</li></ul> | <ul><li>Changes shared wait semantics for both backends, on a release branch, in a tests-only PR</li><li>Per-selector `:not(.g-disabled)` already has precedent (`run_workflow_disabled`, `has_class("g-disabled")` in `navigates_galaxy.py`)</li><li>Needs its own audit of GButton call sites; better as a separate `dev` PR</li></ul> |

## Scope: stack on #24380 and undelete through the panel

Restore the original `galaxy_ui_driver` test, which undeletes the paused job's input with `history_panel_include_deleted` / `history_panel_item_undelete` from #24380 (APPROVED, still OPEN on `release_26.2`).

| Pros | Cons |
|---|---|
| <ul><li>Matches the source commit, so the restack is trivial</li><li>More of the flow happens in the UI</li></ul> | <ul><li>Blocks this branch on an unmerged PR</li><li>#24380 already E2E-tests panel undelete; this test is about resuming, and API undelete isolates that</li></ul> |

## Scope: contract (split or drop one half)

Ship only one of the two tests, or split them into two PRs.

| Pros | Cons |
|---|---|
| <ul><li>Each PR is one feature and reviews trivially</li></ul> | <ul><li>The halves are already independent commits; splitting is a decomposition choice, not a scope gain</li><li>Dropping either leaves a 26.2 feature with no E2E</li><li>Two tiny PRs cost more reviewer overhead than one small one</li></ul> |

## Not considered further

- **Other resume entry points.** Only `HistoryOptions.vue` offers a resume action, so there's nothing to widen to.
- **Other standalone `galaxy_ui_driver` coverage commits** (copy link, datasets list, related filter, remote files). They're in unrelated areas, and the upstream plan tracks them separately.
