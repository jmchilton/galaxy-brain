# Initial implementation debrief

John asked for the two collection FAQ-loop tests (`a32e15d771d`, `64ad58a8c2a`) to go on a new branch. I cherry-picked them from `galaxy_ui_driver` onto `origin/release_26.2` `3977a5f7670`, preceded by `e31b6908bec`. Head `8ebe71ac0e3`.

## Scope

`64ad58a8c2a` conflicted with 26.2 only because its hunks sit next to `e31b6908bec`'s ("Test building a list that keeps file extensions"). The upstreaming plan already pairs the two, so John chose to include it (2026-10-21). With it, all three apply cleanly.

## Base

The base is `release_26.2`, like the other coverage PRs (missing tests for the release). There are no Vue changes. The client side only touches `navigation.yml` and `schema.ts`.

## Overlap

[`selenium_history_datatype_citations`](../selenium_history_datatype_citations/index.md) edits `test_collection_edit.py::test_change_datatype_simple_list` a few lines below this branch's edit. `git merge-tree` shows the two branches merge cleanly.

## Verification

Tests ran against a framework-managed server: no `GALAXY_TEST_EXTERNAL`, client built in place, because another session holds 8080. The run covered `test_collection_edit.py` (3) plus the two new `test_collection_builders.py` tests.
- Playwright (headless): 4/5 pass. `test_change_dbkey_simple_list` fails because the local server has no `tool-data/shared/ucsc/builds.txt`, so Save stays disabled. That test is untouched by this branch, and the same failure is noted on the citations branch.
- After copying `builds.txt.sample` to `builds.txt` (gitignored), Selenium passes 5/5.

## Red

These are test-only commits with no product fix, so there is no hook to revert. `history_panel_collection_edit(hid)` replaces a selector that clicked the panel's first `.edit-btn`. That only worked while the collection was the newest item.
