# Rescope debrief — workflow_open_exact_title (scope B)

The branch now implements scope B from [scope_evaluation.md](scope_evaluation.md). The original scope is preserved as `workflow_open_exact_title_alt_original_scope` and was not touched. The branch was not rebased: it still sits on `65132d40dac`.

## What changed

New commits, after the existing three (`8a367e63730`, `3a1cab1b33b`, `de0dae90db7`):

- `fac17d4f016` **Delete and bookmark the workflow card titled NAME** (`lib/galaxy/selenium/navigates_galaxy.py`)
  - The settled-search wait moved out into `_workflow_card_titled(name)`.
  - `_workflow_card_action(name, target)` now returns the matched card. It still opens the list, searches, and runs the lookup and click under `retry_call_during_transitions`.
  - `workflow_bookmark_by_name` now goes through `_workflow_card_action(name, bookmark_link(action="add"))`.
  - `workflow_delete_by_name` goes through `_workflow_card_action(name, workflow_drop_down)`. It then finds the delete item **inside the returned card**, waits until it is displayed, and clicks it. The confirm dialog is still found globally.
  - Both helpers now open the workflow list themselves. Before, they assumed the caller was already on it.
- `9653e9ff1cd` **Drop dead workflow name reassignment in undo/redo test**
  - In `test_workflow_editor_undo_redo.py:75`, `name =` was assigned `None` and never read again. Only the call remains.
- `553ca2363f7` **Test bookmarking and deleting a workflow whose title prefixes another's**
  - New test: `test_workflow_management.py::test_workflow_bookmark_and_delete_by_exact_title`.
  - It uploads `NAME`, then `NAME (copy)`, which is newer and so listed first.
  - It bookmarks `NAME`, waits through the API until some matching workflow is bookmarked, and asserts that the bookmarked set is exactly `[NAME's id]`.
  - It then deletes `NAME`, waits until one match remains, and asserts that the remaining set is exactly `[copy's id]`.
  - It sits beside `test_workflow_delete` and `test_workflow_bookmark_filtering`, the only callers of these helpers. Sibling branches don't touch this file.

### The menu is not teleported, and that matters

- `GDropdown` (galaxy-ui) renders its menu inside its own container, and `lazy` defaults to false.
- So every workflow card carries its own hidden `g-card-action-workflow-delete-*` item.
- The old global `delete_button.wait_for_and_click()` therefore resolved to the first card's item.
- Under Playwright this deleted the wrong workflow (see the red evidence below). Scoping the item to the matched card fixes it.

### Test detail: explicit `workflow_index_open()` before the bookmark

- The base helpers never opened the list.
- Without this call, the red run sat on the home page waiting for the search box: more than 10 minutes, then killed, with no assertion reached.
- The existing callers also start on the list, so the call mirrors real usage and makes the red failure land on the assertion. It is redundant with the new helper, but harmless.
- A one-line comment explains the call, so a reviewer doesn't drop it and lose the clean red check.

## Red/green evidence (Playwright)

No stash was used. The helper file was reverted with `git checkout <rev> -- lib/galaxy/selenium/navigates_galaxy.py` and then restored from HEAD.

| Run | Helper state | Result |
|---|---|---|
| Red 1 | `navigates_galaxy.py` from `fac17d4f016~1` (old bookmark and delete) | FAIL at `assert bookmarked_ids == [workflow_id]`: `['fe38c84dcd46c828'] == ['a0d84b45643a2678']`. The copy was bookmarked. |
| Red 2 | new bookmark, old delete hand-restored | FAIL at `assert remaining_ids == [copy_id]`: `['ba0fa2aed4052bce'] == ['59606d2a36c77a56']`. The copy was deleted, so each half discriminates on its own. |
| Green | HEAD | PASS |

## Tests run (one at a time; local Galaxy and Vite started from this worktree, then stopped)

| Test | Playwright | Selenium |
|---|---|---|
| `test_workflow_management.py::test_workflow_bookmark_and_delete_by_exact_title` | PASS, run several times | PASS |
| `test_workflow_management.py::test_workflow_delete` | PASS | PASS |
| `test_workflow_management.py::test_workflow_bookmark_filtering` | PASS | PASS |
| `test_workflow_editor.py::test_open_and_run_workflow_by_exact_title` | PASS | — |
| `test_workflow_editor_undo_redo.py` (2 tests, covers the `:75` edit) | PASS | — |

Other checks:
- pre-commit (`.pre-commit-config.yaml.sample`) passed on all three files.
- `cd lib && mypy galaxy/selenium/navigates_galaxy.py` reported no errors in that file.

### Environment notes

These are not branch issues.

- **Shared login user.** With the shared login user from `~/galaxy_selenium_context.yml`:
  - `test_workflow_delete` and `test_workflow_bookmark_filtering` fail at their *setup* assertions ("Expected 1 workflows ... found 24"), because that user has accumulated workflows.
  - The final runs therefore used a scratch copy of the config without `login_email`/`login_password`, which makes the framework register a fresh user for each test.
  - The red runs used the shared user. Random names keep them valid.
- **Machine load.** Other sessions pushed the load average to about 28.
  - One run hit a setup `Page.goto` timeout.
- **Selenium setup.** Selenium needed `GALAXY_TEST_SELENIUM_HEADLESS=0` (pyvirtualdisplay isn't installed) and chromedriver 155 from `~/.cache/selenium` on PATH.

### Unexplained ~30s card-action gap (for the review to check)

- **What was seen.** Galaxy's access log showed a steady gap of about 30s between the search request and the action:
  - bookmark: 30s and 31s
  - delete: 34s
  - the existing open/run path (`de0dae90db7`'s test): 30s
- **Likely cause.** 30s is Playwright's default action timeout. A plausible cause is a click blocked (an overlay, or a locator detached from the card) that times out, after which `retry_call_during_transitions` retries and succeeds.
- **Probe result.** A temporary probe, printing timings around the lookup and click, only ran during quieter periods. It saw found + clicked in under 1s and never caught a slow case. So this is neither confirmed nor ruled out.
- **Scope.** If real, it predates the scope-B commits, since the open/run helpers from the original fix show it too, and it costs up to 30s per by-name call. It was not investigated further.

## Sibling merges

`git merge-tree --write-tree` comes out clean against both `workflow_editor_run_cancel` and `workflow_editor_second_subworkflow`. This was re-run after the new commits.

## Deferred (unchanged from scope evaluation)

- **D.** The canvas wait stays in `test_open_and_run_workflow_by_exact_title`. Moving it into `workflow_index_open_with_name` is a follow-up owned by this branch (ideally on dev, after the `workflow_editor_run_cancel` client fix). Reword the test comment at restack time if that sibling lands first.
- **C.** Make `workflow_create_new` return the stored title. Optional dev cleanup.
- **E.** Other search-then-click-first helpers (libraries, grids, the editor Workflows panel). Dev-side, and the editor panel is owned by a sibling branch.
- **F.** Exact-only matching. Rejected.

## Review

A normal subagent review (`subagents/rescope_review.md`) found the scope-B commits correct and changed nothing in them.

- **Added:** `51210356c69` "Snapshot Playwright find_elements instead of count then nth" (`has_playwright_driver.py` only).
  - `count()` followed by `nth(i).element_handle()` waits out Playwright's default 30s if the list shrinks in between. The fix takes one `element_handles()` snapshot, which matches Selenium.
  - The race was reproduced in a standalone Playwright script. That it explains the ~30s gap above is plausible but unconfirmed, since fresh-user runs never shrink the list.
  - It is a separate commit at HEAD, so it can be dropped or split out into its own PR.
- **Checked OK:**
  - The callers still work now that the helpers open the list themselves.
  - Retries look the card up again rather than reusing a stale one.
  - `is_displayed` agrees on both backends for the dropdown.
  - The test is red for each half on the old code.
- **Not acted on:**
  - The test's explicit `workflow_index_open()` and its comment are redundant with the new helpers, but the red check needs them.
  - Return annotations are missing on `_workflow_card_titled` and `_workflow_card_named`. Cosmetic.
- Pushed head `51210356c69`. Stray Galaxy servers left by earlier runs in this worktree have been stopped.
