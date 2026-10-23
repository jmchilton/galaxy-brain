# Scope evaluation

**Recommendation: keep scope as implemented.** The first evaluation's expansion ([earlier_drafts/1](earlier_drafts/1/scope_evaluation.md)) is done. `storage_dashboard_cleanup(operation)` drives all three Free up disk space operations, and each operation has E2E, so the `${operation}` selectors, the helper and the tests now line up. Every scope item the debriefs raise is either done (the generalization) or fits better in a separate `dev` PR (the driver-level enabled wait). The one untested neighbour left is the Explore usage charts' per-item Permanently Delete / Undelete (`SelectedItemActions`). It is a different component, and no code or helper on this branch touches it, so it belongs in its own PR. It's not a generalization of this one. This evaluates head `30f2122cd91`, and its base `b66ec973f2b` is still the `origin/release_26.2` tip, so there's no drift.

## Possible Decompositions

The branch is +137/-5 over 6 files, in 4 commits that map onto separable pieces:

1. **`navigate_to_storage_dashboard` refactor** (`e4aada751bd`). The helper, plus `test_history_storage_accessibility` switched over to it. Standalone; lands first or with 3.
2. **Resume Paused Jobs** (`217e3c152cf`). The `data-description="resume paused jobs"` hook, `click_history_option_resume_paused_jobs` and `test_resume_paused_job`. Independent of 1, 3 and 4.
3. **Deleted datasets cleanup** (`53fd9c87e28`). The card `data-description`, the `storage_dashboard.cleanup` selectors, `storage_dashboard_cleanup(operation)` and the dataset purge test. Depends on 1.
4. **Deleted and archived histories cleanup** (`30f2122cd91`). `success_close` and the histories test. Depends on 3.

The options are: (a) one PR, as now; (b) 1+3+4 as a "Storage Dashboard cleanup E2E" PR, with 2 as a separate "Resume Paused Jobs E2E" PR; (c) 1 → 3+4, with 2 in parallel.

## Scope: as implemented (recommended)

E2E for History options > Resume Paused Jobs (the input is undeleted through the API) and for all three Storage Dashboard > Free up disk space operations (`deleted_datasets`, `deleted_histories`, `archived_histories`) through one generic `storage_dashboard_cleanup(operation)`. Adds two `data-description` client hooks and the `storage_dashboard.cleanup` selectors, and refactors `navigate_to_storage_dashboard`.

| Pros | Cons |
|---|---|
| <ul><li>Covers every cleanup operation behind the shared `ReviewCleanupDialog`/`CleanupResultDialog`, including `_unarchive_if_needed`</li><li>One parameterized helper and no duplicated operation literals; the earlier reviews' deferred generalization is done</li><li>Green under both backends; the rescope review and the re-harden passes (test challenges, polish, codex, thermo-nuclear) all reviewed it, and nothing is open</li><li>Independent of #24380 (still OPEN, APPROVED, on `release_26.2`)</li></ul> | <ul><li>gxui's `datasets-purge-deleted` verb has to be rebound on restack, because there's no compat wrapper (noted in `index.md`)</li><li>3 E2E tests at 25–50s each, on both backends</li><li>Codex's 15s paused-job race is still accepted, not removed</li></ul> |

## Scope: Explore usage per-item purge/undelete

Add E2E for the Explore usage chart actions: select a deleted history in `HistoriesStorageOverview` (or a deleted dataset in `HistoryStorageOverview`), then Permanently Delete or Undelete through `SelectedItemActions`. `WarnDeletedHistories.vue` points users to this as the alternative to the cleanup cards.

| Pros | Cons |
|---|---|
| <ul><li>A second UI purge path on the same dashboard with no E2E. The only `SelectedItemActions` test is `test_delete_dataset_from_storage_view`, which deletes an active dataset</li><li>Precedent to build on: the `history_storage.dataset_by_size` bar selector and the `#g-card-action-delete-selected-item-actions-*` action ids</li></ul> | <ul><li>Not code this branch touches: a different component (`Visualizations/`) and flow (chart bar selection and a confirm dialog)</li><li>Shares no helper or selector with `storage_dashboard_cleanup`, so it isn't a generalization of this branch</li><li>Needs new selectors for the histories chart and for the undelete/purge actions</li></ul> |

A good follow-up as its own small "missing E2E" PR.

## Scope: driver-level enabled wait that honors `g-disabled`

Teach the clickable/enabled wait to respect `g-disabled`/`aria-disabled`, and drop the per-selector `:not(.g-disabled)` entries. The first thermo-nuclear pass raised this; the current one notes again that there's no canonical `wait_for_enabled`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a Selenium-side gap for every GButton</li><li>Removes the `*_enabled` selector variants</li></ul> | <ul><li>Changes the shared wait semantics on both backends, on a release branch, in a tests-only PR</li><li>Inline `g-disabled` handling has precedent (`run_workflow_disabled`, `has_class("g-disabled")`)</li><li>Needs an audit of GButton call sites; better as a separate `dev` PR</li></ul> |

## Scope: stack on #24380 and undelete through the panel

Restore the source `galaxy_ui_driver` test, which undeletes the paused job's input with `history_panel_include_deleted` / `history_panel_item_undelete` from #24380.

| Pros | Cons |
|---|---|
| <ul><li>Matches the source commit, so the restack is trivial</li><li>More of the flow happens in the UI</li></ul> | <ul><li>Blocks on an unmerged PR (#24380 is still OPEN)</li><li>#24380 already E2E-tests panel undelete; this test is about resuming, and the API undelete isolates that</li></ul> |

## Scope: contract (split or drop a half)

Ship only the storage cleanup tests or only the resume test, or drop the histories commit.

| Pros | Cons |
|---|---|
| <ul><li>Each PR covers a single feature</li></ul> | <ul><li>The pieces are already independent commits, so splitting is a decomposition choice (above), not a scope gain</li><li>Dropping a piece leaves a 26.2 feature with no E2E, and dropping the histories commit undoes the re-scope the first evaluation asked for</li><li>At +137 lines, one PR is cheap to review</li></ul> |

<details><summary>Details</summary>

- Upstream drift: `git log b66ec973f2b..origin/release_26.2` is empty after fetch.
- Coverage search: `deleted_histories`/`archived_histories` now appear only in this branch's tests. `HistoriesStorageOverview`/`selected-item-actions` have no hits in `lib/galaxy_test/selenium/`. The `test_permanently_delete_history` hit in `test_histories_list.py` is the histories list, not the storage overview.
- These deferred items are settled in the debriefs and aren't scope questions: the `Literal` type for `operation`, folding `no_items` into the helper, closing the result modal in the helper, shared fresh-user setup, a shared paused-job populator, and the double `get_history` fetch.
- Other resume entry points: `HistoryOptions.vue` is still the only one.

</details>
