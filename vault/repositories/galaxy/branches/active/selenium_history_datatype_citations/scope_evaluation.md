# selenium_history_datatype_citations scope evaluation (2026-10-21, second pass)

**Recommendation: keep scope.** The re-scope landed what the first evaluation asked for. Both Selection-menu modals that apply one picked value (Change data type and Change Database/Build) now share `operation_modal` and `history_panel_change_selected`, and both have UI+API tests with an unselected-hid negative check. The Export Tool References test covers both tabs. Every remaining candidate fails at least one of the bias's tests for a modest expansion. None is a bug in touched code:
- The dbkey modal's missing `:ok-disabled` is not a bug. `selectedDbKey` starts at, and resets to, `{id: "?"}`, so OK always sends a valid dbkey.
- None generalizes the new abstraction. Bulk add/remove tags use `StatelessTags`, not `SingleItemSelector`, so they need a different helper and modal. Hide, delete and purge have no modal at all.
- The rest are refactors of pre-existing code (thermo follow-ups, `test_collection_edit.py`/`test_collection_builders.py` helper dedupe) or removal of a public `galaxy.selenium` method (`history_panel_multi_operation_action_click`). Both belong on `dev`, not in a 26.2 coverage PR.

A history-citations API test is the closest call. The E2E test already drives that endpoint end to end and asserts the tool's citation appears, so it stays a follow-up. Don't contract either. John asked for one branch, and the dbkey addition is about 30 lines on top of a shared helper.

Reviewed `origin/release_26.2...selenium_history_datatype_citations` (head `50dc4ccb773`, 4 commits, 8 files, +120/−3) fresh. Inputs:
- the initial, re-scope, test challenges, polish, codex, thermo and baseline debriefs
- `alts/original_scope.md`
- both `subagents/` reviews
- the first evaluation in `earlier_drafts/1/`
- the [upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md)

`index.md` is stale (head `adea322053b`, pre-re-scope names).

## Possible Decompositions

The branch has about 117 hand-written lines (Vue hooks, `navigation.yml`, Python). The split follows the commits. This section isn't a recommendation to split.

- **Option 1: as one PR (current).** The 4 commits in order.
- **Option 2: two PRs.**
  1. **Selection modals:** `bfdb81e99e4` helper, then `c840d9d0b94` datatype, then `af2b8899d5c` dbkey (+81/−9). The dbkey commit builds on the datatype commit's `operation_modal`, `history_panel_change_selected` and setup, so they land together and in that order.
  2. **Tool references:** `50dc4ccb773` (+45). It shares no code with PR 1 and can land before or after it.
- **Option 3: three PRs.**
  1. `bfdb81e99e4`, the helper refactor (+5/−3). It stands alone on 26.2 and `test_collection_edit.py` uses it.
  2. The datatype and dbkey tests, on top of the helper PR.
  3. The tool references test, independent of both.

  This adds review overhead for a 5-line commit, but it lets the "Baseline"-style refactor land first.

## Scope 1: As implemented (recommended)

The branch has four commits:
- the `history_panel_wait_for_hid_datatype` refactor
- the bulk Change data type and Change Database/Build tests, sharing `operation_modal`, `history_panel_change_selected` and `_select_two_of_three_datasets`, with `history_panel_wait_for_hid_dbkey`
- the Export Tool References test with both tabs

It adds 5 `data-description` hooks. The Selection tests use `@managed_history`.

| Pros | Cons |
|---|---|
| - Covers every `SingleItemSelector` Selection modal; the shared helper has two real callers<br>- Hardened twice: reviews acted on, green under both backends<br>- No product changes; fits the 26.2 "missing tests" framing<br>- Restack plan for `galaxy_ui_driver` is recorded (drop both FAQ commits; repoint gxui's `history-change-datatype` verb) | - `galaxy_ui_driver` diverges more (no dbkey commit there, old helper names)<br>- Leaves known follow-ups (thermo items, dead helper) for `dev` |

## Scope 2: + Bulk add/remove tags from the Selection menu

Hook the Add tags/Remove tags GModals and test bulk tagging two of three items through `tagging_add` inside the modal, checking `history_panel_item_get_tags` and the API.

| Pros | Cons |
|---|---|
| - Same SFC, same menu, no E2E caller today<br>- `tagging_add(parent_selector=…)` and `history_panel_item_get_tags` already exist, so about 30 lines | - Different modal pattern (`StatelessTags`); doesn't reuse `operation_modal`/`history_panel_change_selected`<br>- Not raised by any review; second expansion of a branch already widened once<br>- Opens the door to Scope 3; better as its own Selection-menu coverage PR |

## Scope 3: Whole Selection menu

Scope 2, plus hide/unhide, delete/undelete, purge, storage operation and "build list all". None of these `data-description`s has an E2E caller.

| Pros | Cons |
|---|---|
| - Closes the Selection menu's E2E gap in one PR | - Several times the size, so not modest; mixed patterns (immediate actions, wizard modal)<br>- Hide/delete/purge have API coverage; lower E2E value<br>- First evaluation already rejected it |

## Scope 4: Make the dbkey modal's OK button disable when no build is picked

Add `:ok-disabled="selectedDbKey == null"` to the dbkey GModal to mirror the datatype modal (re-scope review nit 4).

| Pros | Cons |
|---|---|
| - Symmetry with the datatype modal | - Not a bug: `selectedDbKey` initializes and resets to `{id: "?"}` (`SelectionOperations.vue:241,245`), so OK always sends a valid dbkey<br>- No test can go red for it; it's a product change with no observable fix |

## Scope 5: History citations API test

Add an API test for `GET /api/histories/{id}/citations`. It would run a tool with a citation and assert the entry's format and content. No API test covers the endpoint today; only unit tests for `CitationsManager` exist.

| Pros | Cons |
|---|---|
| - Fits "missing tests on 26.2"; small (about 15 lines in `test_histories.py`)<br>- The E2E test uses the endpoint as its oracle, so a direct test pins it | - The branch doesn't touch the endpoint; the E2E already exercises it end to end and asserts the tool's citation (`@misc{Garrison2015`) appears<br>- Different test layer and file; the test-challenges pass called it out of scope |

## Scope 6: Thermo follow-ups

Make `assert_item_extension`/`assert_item_dbkey_displayed_as` delegate to the new waiters. Add a shared GModal-confirm `ok` selector (now 7 copies). Delete the dead `history_panel_multi_operation_action_click` and its `action_button`/`action_menu` selectors, which sit next to the new helper.

| Pros | Cons |
|---|---|
| - Removes two-helpers-one-concept duplication, now doubled<br>- Dead code sits next to the new helper | - Refactors code and tests outside the branch's tests, with no bug behind it<br>- Deleting a method from the published `galaxy.selenium` package on a release branch is an API removal; `galaxy_ui_driver` still carries it<br>- Every hardening pass deferred these to `dev` |

## Scope 7: Dedupe `test_collection_edit.py`/`test_collection_builders.py` helpers

Both files have private `_wait_for_and_select`, a copy of `NavigatesGalaxy.history_panel_wait_for_and_select`. `test_collection_edit.py:100` and `test_collection_builders.py:161` also have unused `_collection_dropdown` "selected content menu" wrappers (re-scope review #6). Replace or delete them.

| Pros | Cons |
|---|---|
| - `test_collection_edit.py` is already touched by commit 1<br>- About 25 deleted lines | - Pure cleanup; `test_collection_builders.py` has 8 callers of its copy, which spreads the diff into an untouched file<br>- Unrelated to the two pages under test |

## Scope 8: Citations page actions

Extend `test_export_tool_references` to cover Copy (APA/BibTeX) and Download BibTeX.

| Pros | Cons |
|---|---|
| - Covers the rest of the page | - Clipboard and download handling differ between backends and are fragile in CI<br>- Thin wrappers over formatting the BibTeX tab already checks |

## Scope 9: Contract

There are two ways to contract:
- Revert to `selenium_history_datatype_citations_alt_original_scope` (no dbkey).
- Split into separate PRs (see Possible Decompositions).

| Pros | Cons |
|---|---|
| - Smaller diffs; the alt matches `galaxy_ui_driver`'s commits exactly | - John asked for one branch; the dbkey addition was the first evaluation's recommendation and is about 30 lines on a shared helper<br>- Reverting would make `history_panel_change_selected` single-use again |
