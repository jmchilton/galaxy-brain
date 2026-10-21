# selenium_history_datatype_citations scope evaluation (2026-10-21)

**Recommendation: expand (modestly).** Add E2E coverage for the Selection menu's bulk **Change Database/Build**, next to the bulk Change data type test. That modal is the GModal just above the one this branch hooks in `SelectionOperations.vue`. It uses the same `SingleItemSelector` pattern, it has no `data-description`, and no selenium test opens it (`"change database build"` has no caller). Normal review #8 raised it and set it aside as "out of scope for a missing-tests PR". That is the kind of narrowing John has overruled before. The work is small: a `data-description` on the dbkey modal, a `change_dbkey_modal` component and one test. Generalize `history_panel_change_datatype_of_selected` into a shared "set a value through a selection modal" helper that both operations use. CI can run it: `test_history_dataset_state.py::test_dataset_change_dbkey` already selects `apiMel3` there. The local failure of `test_change_dbkey_simple_list` comes from a missing `tool-data/shared/ucsc/builds.txt`, which `common_startup.sh` copies from the sample. It is not a related bug. Leave out the rest of the Selection menu (tags, hide/delete/purge), the thermo refactor follow-ups and any split.

Reviewed `origin/release_26.2...selenium_history_datatype_citations` (head `86975a0d75d`, 3 commits, 8 files, +89/−3). Inputs: `index.md` (its `adea322053b` head is stale), the initial, test challenges, polish, codex, thermo and baseline debriefs, `subagents/normal_review.md`, [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md), and the precedent evaluations in `workflow_editor_run_cancel` and `selenium_multiview_copy`. Both precedents expanded on their first pass.

The branch has about 92 lines of non-generated code. That's under 100, so there's no Possible Decompositions section.

## Scope 1: As implemented

The `history_panel_wait_for_hid_datatype` refactor, the bulk Change data type test (with a negative check on an unselected hid) and the History options > Export Tool References test with both tabs. It adds four `data-description` hooks, two `navigation.yml` components and three `NavigatesGalaxy` helpers.

| Pros | Cons |
|---|---|
| - Exactly the two FAQ-loop tests John asked for, on one branch<br>- Hardened: every review is acted on, green under both backends<br>- Matches `galaxy_ui_driver` commits, so the restack drop is clean | - Leaves the sibling dbkey modal unhooked and untested in the same component<br>- `history_panel_change_datatype_of_selected` handles one modal when the same flow serves two |

## Scope 2: + bulk Change Database/Build (recommended)

Scope 1, plus a `data-description="change database build modal"` hook, a `history_panel.multi_operations.change_dbkey_modal` component (`_`, `item_selector`, `ok`), a shared helper for "open Selection option > wait for `SingleItemSelector` > `select_set_value` > OK > wait for close", and `test_change_dbkey_of_selected_items` in `test_history_panel.py`. That test mirrors the datatype test: two selected hids change, the third stays `?`, and both the panel and the API are checked. It adds about 30 lines.

| Pros | Cons |
|---|---|
| - Normal review raised it; same file, same pattern, same test file<br>- Turns a one-off helper into a reusable one with two callers<br>- Bulk dbkey has no E2E coverage today; it fits the "missing tests" framing for 26.2<br>- Unlike datatype, dbkey doesn't need Celery, so it also covers the non-Celery bulk path | - No FAQ-loop commit behind it, so `galaxy_ui_driver` diverges further (the restack note in `index.md` must mention it)<br>- Local runs need `builds.txt` copied from the sample<br>- Another hardening pass (review, both backends) |

<details>
<summary>Details</summary>

- Feasibility: the dbkey modal's `DbKeyProvider` loads from the genomes API. In CI, `common_startup.sh` puts `builds.txt` in place, and `test_dataset_change_dbkey` already picks `Honeybee (Apis mellifera): apiMel3 (apiMel3)` through a dbkey selector. Pick the same build.
- The dbkey modal has no `:ok-disabled` and no error alert, unlike the datatype modal. Its default is `?`, so OK is always valid. That's not a bug; it doesn't need a product change.
- Name the helper's selector child `item_selector` again, not `selector` (`select_set_value` reads `.selector`; codex finding 1).
- If the shared GModal-confirm `ok` selector isn't done (see scope 4), it's a 7th copy of `.g-modal-confirm-buttons button:last-child`. That's acceptable.

</details>

## Scope 3: Whole Selection menu

Scope 2, plus coverage for bulk add/remove tags, hide/unhide, delete/undelete and purge from the Selection menu. None of them has an E2E caller today, and `history_panel_multi_operation_action_click` has no callers at all.

| Pros | Cons |
|---|---|
| - Closes the Selection menu's E2E gap in one PR<br>- Could drop or revive the dead `history_panel_multi_operation_action_click` | - Several times the size, so not "modest"<br>- Tags use `StatelessTags`, a different modal pattern, so the shared helper doesn't carry over<br>- Hide/delete/purge have API coverage; the E2E value is lower and none of this comes from a FAQ<br>- Better as its own `dev` coverage PR |

## Scope 4: Thermo refactor follow-ups

Merge `assert_item_extension` (`framework.py`, 4 callers in `test_upload_activity.py`) with `history_panel_wait_for_hid_datatype`, and add a shared GModal-confirm selector for the 6 `.g-modal-confirm-buttons button:last-child` copies.

| Pros | Cons |
|---|---|
| - Removes the two-helpers-one-concept duplication the thermo review found<br>- A GModal-confirm component would serve every future modal test | - Refactors existing code outside both tests, with no bug behind it<br>- Touches unrelated test files on a release branch<br>- `workflow_editor_run_cancel`'s second pass deferred the same kind of item |

## Scope 5: Dedupe `test_collection_edit.py` helpers

`test_collection_edit.py`, which the baseline refactor commit already touches, has a private `_wait_for_and_select` that is a verbatim copy of `NavigatesGalaxy.history_panel_wait_for_and_select`, and a dead `_collection_dropdown`. Both could go in the refactor commit.

| Pros | Cons |
|---|---|
| - About 15 deleted lines in a file the branch already edits<br>- Same spirit as the `history_panel_wait_for_hid_datatype` swap | - Pure cleanup with no behavior change; `test_collection_builders.py` has the same `_collection_dropdown` copy, so a full dedupe spreads<br>- Optional; fine either way, not part of the recommendation |

## Scope 6: Citations page actions

Extend `test_export_tool_references` to exercise Copy (APA/BibTeX) and Download BibTeX.

| Pros | Cons |
|---|---|
| - Covers the rest of the page | - Clipboard and download handling differ between Selenium and Playwright and are fragile in CI<br>- Low value: thin wrappers over citation-js formatting, which the BibTeX tab already checks |

## Scope 7: Contract (split datatype and citations)

Two PRs, one per test, with the refactor commit going with the datatype one.

| Pros | Cons |
|---|---|
| - Each PR is smaller and independent (they share no code) | - John explicitly asked for one branch<br>- Both are already small; splitting adds review overhead without lowering risk |
