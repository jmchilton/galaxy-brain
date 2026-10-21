# Scope evaluation — workflow_open_exact_title

**Recommendation: expand modestly (scope B). Send `workflow_delete_by_name` and `workflow_bookmark_by_name` through the same title-matched card lookup, and extend the new test so a delete or bookmark of `NAME` leaves the newer `NAME (copy)` alone. Also drop the dead `name =` assignment at `test_workflow_editor_undo_redo.py:75`. Keep the canvas wait in the test, but record it as a follow-up owned by this branch. Leave everything else out: exact-only matching, the `workflow_create_new` placeholder, the grid and library helpers, the editor-panel search (owned by a sibling) and 7i (John already decided it).**

Reviewed `65132d40dac..workflow_open_exact_title` (head `de0dae90db7`, 3 commits). That is about 58 non-generated lines across `navigates_galaxy.py`, `test_workflow_editor.py` and one `navigation.yml` line, so there is no decomposition section. Sources: `index.md`, the initial, test-challenge, polish, Codex, thermo and baseline debriefs, the [upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md), and the sibling records [`workflow_editor_run_cancel`](../workflow_editor_run_cancel/index.md) (and its scope evaluation) and [`workflow_editor_second_subworkflow`](../workflow_editor_second_subworkflow/index.md).

## Scope items raised by reviews

| Source | Item | Disposition |
|---|---|---|
| Coordinator | Other list helpers that click the first result after a search | Same workflow list: **fold in** (B). Other areas: defer (E). |
| thermo; sibling eval (scope E) | Canvas wait inside `workflow_index_open_with_name` instead of the test | Keep it in the test. Follow-up owned here (D). |
| polish | `workflow_create_new` returns `<name>`, but the stored title is `Unnamed Workflow<name>` | Defer (C). Optional. |
| thermo (code-judo) | Exact-only matching: drop the contains-fallback and its gate | Reject (F) |
| thermo | `test_workflow_editor_undo_redo.py:75` `name = self.workflow_index_open_with_name(name)` assigns `None` | **Fold in.** One line, in a direct caller of the changed helper. |
| Codex | A search hit that matches only on a tag or annotation keeps the gate from settling | Known limit. The helper times out loudly instead of clicking the wrong card. Not a scope item. |
| index.md, plan | 7i (colon-free search term) | Out. John decided this on 2026-10-20: it isn't needed on 26.2 and goes up with gxui. |

## A. As implemented

`workflow_index_open_with_name` and `workflow_run_with_name` share `_workflow_card_action`. It waits until the search has settled, picks the card titled exactly NAME (else the only card whose title contains NAME), and clicks the card's edit or run button. A new E2E test opens and runs `NAME` while `NAME (copy)` is listed first.

| Pros | Cons |
|---|---|
| It is red without the fix, at the test's own assertions, and green under both backends. 27 existing callers are covered without being edited. | `_workflow_card_action` is new, yet `workflow_delete_by_name` and `workflow_bookmark_by_name` sit about 90 lines below it and still click the first search hit. A reviewer will ask why they weren't converted. |
| It is a clean cherry-pick replacement for 7c and 7g. `git merge-tree` with `workflow_editor_run_cancel` is clean and leaves a single `canvas_loading` line. | It leaves a known one-line bug (`undo_redo:75`) in a direct caller. |

## B. Modest expansion: delete and bookmark by title (recommended)

Split `_workflow_card_action` into a reusable "open the index, search, and return the card titled NAME" step plus a click. Then use it from `workflow_delete_by_name` (click the card's dropdown, then the delete item) and `workflow_bookmark_by_name` (`bookmark_link(action="add")`). Extend `test_open_and_run_workflow_by_exact_title`, or add a sibling test, so it bookmarks or deletes `NAME` and asserts `NAME (copy)` is untouched. Fold in the `undo_redo:75` fix.

| Pros | Cons |
|---|---|
| It finishes the job in the code being touched. Every by-name action on the workflow list then uses one matcher, which gives a more reusable abstraction than a click-only helper. | Today's delete and bookmark callers can't hit the race (a fresh user with 1-2 workflows). The new coverage therefore needs a test that discriminates, otherwise it breaks the plan's "grow E2E coverage" rule. |
| The added test keeps it a coverage PR. The lines involved (around 1888-1897) are away from both siblings' hunks. | Delete is two steps. Only the dropdown toggle needs card scoping. The menu items render inside `GCard`'s `GDropdown`, but whether it teleports needs checking during implementation. It also needs the retry wrapper to cover the toggle click. |
| `workflow_delete_by_name` gains the index navigation it currently assumes. | It needs Playwright and Selenium reruns for `test_workflow_delete`, `test_workflow_bookmark_filtering` and the new test, and it rewrites 7c/7g's replacement commit. |

<details>
<summary>Details</summary>

- **Suggested shape.** Rename or split so that `_workflow_card_titled(name)` returns the settled card (the existing `_wait_on` around `_workflow_card_named`). `_workflow_card_action(name, target)` stays a thin "find, click within, under `retry_call_during_transitions`" wrapper. `workflow_delete_by_name` calls the action with `workflow_drop_down` and then clicks `delete_button` and confirm as today. `workflow_bookmark_by_name` calls it with `bookmark_link(action="add")`. Templated targets expose `element_locator` once they are called.
- **Red check.** Bookmark `NAME` with `NAME (copy)` listed first, then assert through the API, or through the `is:bookmarked` filter, that only `NAME` is bookmarked. On base the copy gets bookmarked. Delete can be checked the same way. One of the two is enough to keep the test cheap.
- **`undo_redo:75`.** `name` isn't used after the reassignment, so drop the `name =`. It is dead now, but it would become a wrong value if anyone used it later.

</details>

## C. Expansion: `workflow_create_new` returns the stored title

`workflow_create_new` types the random name after the editor's initial value, `Unnamed Workflow` (`Index.vue:178`). The title becomes `Unnamed Workflow<name>`, but the helper returns `<name>`. One fix is to return the field's real value. The other is to make `clear_placeholder` default to True: no caller passes it, and it is misnamed, since this is an initial value, not a placeholder.

| Pros | Cons |
|---|---|
| The returned name becomes honest, and about 20 callers take the exact-match path instead of the fallback. | It doesn't simplify the matcher. `test_edit_name` appends a new name to the old one, and gxui passes user-typed names, so the contains-fallback stays either way. |
| It is a one-line change. | Polish rejected the default flip because it changes a widely shared helper. Returning the real value is safer, but it still touches every editor test's name. The benefit is cosmetic, and so are the reruns. Better as dev-side cleanup. |

## D. Expansion: editor-loaded wait inside `workflow_index_open_with_name`

Move the test's `canvas_body` visible + `canvas_loading` absent wait into the helper, so every caller returns with the workflow loaded.

| Pros | Cons |
|---|---|
| Every caller, plus gxui's `workflow-edit`, gets a "loaded" guarantee. The test drops two lines. | Once `workflow_editor_run_cancel` lands its dirty-on-load client fix, the root cause is gone, which leaves the wait as a nicety. |
| The sibling's evaluation assigned it here, so this branch owns it. | It changes timing for about 27 callers on a release branch, all of which need E2E confidence. Thermo kept it out for that reason. |

<details>
<summary>Coordination note</summary>

- Merge order: if `workflow_editor_run_cancel` lands first, this test's comment ("Loading briefly marks the workflow changed; leaving then would raise the unsaved-changes prompt.") describes a bug that is already fixed. The wait still guards the exact `edit_name` value check, so the code stays as it is. Reword the comment to "wait for the workflow to finish loading" at restack or PR time.
- Both branches add the same `canvas_loading` line. `git merge-tree` merges it cleanly into one key (checked).
- Recommendation: keep the wait in the test. Track D as a follow-up owned by this branch, ideally on dev after the client fix.

</details>

## E. Expansion: other search-then-click-first helpers outside the workflow list

`libraries_open_with_name` searches and then clicks `[0]`. `select_grid_operation` and `select_grid_cell` pick the first row containing the name (3 callers, grids). `workflow_editor_search_for_workflow`, `add_steps` and `add_subworkflow` click the first card in the editor's Workflows panel. There are no by-name helpers for histories, shared workflows or published lists. Those lists go through `select_grid_operation` or `published_grid_search_for`.

| Pros | Cons |
|---|---|
| These are the same class of bug (contains, first match). | They are different components (libraries table, GridList) on untouched code, and no caller hits the bug. That is dev-side area work, not a fix for this release. |
| | The editor-panel helpers belong to sibling `workflow_editor_second_subworkflow` (7d), so touching them would conflict with it. |

## F. Contraction: exact-only matching

Drop the contains-fallback and the "every title contains NAME" gate, and match `title == name` only.

| Pros | Cons |
|---|---|
| It deletes about 5 lines and one concept, and the exact card is correct even on the unfiltered list. | It breaks `test_edit_name` (appended title) and every `workflow_create_new` caller (prefixed title). Polish saw those time out. |
| | It changes gxui's user-typed-name semantics, and gxui adopts this version once 7c and 7g drop out of it. |

## G. 7i (colon-free search term)

Already decided (see `index.md` and the plan, step 4). It is not needed on 26.2, and dev's `filtering.ts` is the same. It only works around test.galaxyproject.org's older client, so it goes up with gxui. No change.

## Unresolved questions

- B: test bookmark, delete, or both? Bookmark alone is the cheaper red check.
- D: track the canvas wait as a dev follow-up after the client fix lands, or drop it?
- C: worth a dev-side cleanup PR (return the real title, rename or remove `clear_placeholder`)?
