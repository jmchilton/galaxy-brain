# Scope evaluation: selenium_history_import_purge

**Recommendation: keep as implemented.** The first scope evaluation's modest expansion (shared top-level `copy_history_modal` replacing the stale `multi_history_panel` entry) is done; the branch now covers both missing E2E paths through reusable selectors/helpers in touched code, and no remaining expansion is clearly worth it. Further candidates (test "Copy this history" from history options via same modal, UI "list empties" assertion after purge) are small follow-ups, not gaps. Note: this branch was already re-scoped once, so any further scope change would park it BLOCKED for John. Branch is well under 100 lines; no decomposition section.

## As implemented

Import-shared-history test from history view and purge-all test from histories list, with `copy_history_modal`, `history_view.import_button`, `histories.bulk_purge_button`/`select_all` selectors and three `NavigatesGalaxy` helpers.

| Pros | Cons |
|---|---|
| - Covers both missing paths<br>- Copy modal selectors reusable by any `CopyModal.vue` mount<br>- Removes stale broken selector | - "Copy this history" menu path still untested |

## Expand: also test "Copy this history" from history options

Add a test copying current history via history options menu through `copy_history_modal`.

| Pros | Cons |
|---|---|
| - Exercises shared component from second mount<br>- Cheap given helpers | - Different feature than scoped "import shared"<br>- Second re-scope parks branch for John |

## Expand: assert histories list empties after purge

Add UI check that list shows no histories after bulk purge.

| Pros | Cons |
|---|---|
| - UI-level confirmation | - API `purged` poll already stronger; rescope debrief chose to skip<br>- Would park branch |

## Contract: split into two PRs (import / purge)

| Pros | Cons |
|---|---|
| - Independent tests | - Each ~35 lines; overhead outweighs benefit |
