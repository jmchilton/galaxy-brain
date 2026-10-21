# Polish E2E tests debrief — workflow_open_exact_title (re-harden)

This pass removed the bare sleep before the confirm dialog in `workflow_delete_by_name` and gave the remaining sleep in `workflow_run_with_name` a comment. No other polish was needed.

Base is unchanged (`65132d40dac`). Both edits were folded in with fixup and autosquash. The final tree is identical to the tested tree. Not pushed.

| Commit | SHA |
|---|---|
| Extract `_workflow_card_action` | `8a367e63730` (unchanged) |
| Open the workflow card titled NAME (sleep comment folded in) | `4b4eb906101` (was `3a1cab1b33b`) |
| Test opening and running by exact title | `c64e90b1d78` (was `de0dae90db7`) |
| Delete and bookmark the card titled NAME (sleep dropped) | `de787f219d7` (was `fac17d4f016`) |
| Drop dead name reassignment in undo/redo test | `676aae5b467` (was `9653e9ff1cd`) |
| Test bookmarking and deleting by exact title | `95a28f74c06` (was `cb3f2b4131e`) |
| Snapshot Playwright find_elements | `8aca76c30be` (was `786132697dd`), HEAD |

## Changes

- **`workflow_delete_by_name`: dropped `sleep_for(UX_RENDER)`.**
  - The sleep sat between clicking the card's delete item and clicking `confirm_dialog.ok_button.wait_for_and_click()`.
  - The wait already covers the dialog appearing. Other confirm-dialog call sites (history list, history storage, workflow rerun, pages, sign out) click `ok_button` with no sleep in front.
  - `GModal` could still be fading in when the click lands. Selenium is the backend that would raise click-intercepted, so the test was run three times under Selenium (see below).
- **`workflow_run_with_name`: kept `sleep_for(UX_RENDER)` and added a one-line comment** saying why it stays.
  - About 13 callers in `test_workflow_run.py`, `test_workflow_editor.py` and `framework.workflow_run_open_workflow` don't all wait on the same run-form element. A single replacement wait (such as `run_workflow`) isn't a safe signal for all of them.
  - The `workflow_editor_run_cancel` sibling's hunk uses this sleep line as context. Swapping the sleep would conflict with it; the comment line does not. `git merge-tree` is still clean against both siblings.

## Checklist

- **Selectors:** no raw CSS/DOM selectors anywhere in the branch.
  - Everything goes through navigation.yml: `workflow_card`, `workflow_card_title`, `edit_button`, `run_button`, `workflow_drop_down`, `delete_button`, `bookmark_link`, `confirm_dialog.ok_button`, `canvas_body`, `canvas_loading`, `edit_name` and `run_workflow`.
- **Shared abstractions:**
  - `_workflow_card_action`, `_workflow_card_titled` and `_workflow_card_named` already serve all four by-name helpers.
  - `card.find_element(*target.element_locator)` appears three times. I left it inline:
    - It is a one-line idiom.
    - A Target-aware scoped finder in `has_driver` would widen scope; the existing `find_element_by_selector(..., element=)` takes CSS only.
    - That makes it a good dev-side follow-up, not something for this bug-fix branch.
- **Sleeps:**
  - Neither test has a sleep.
  - The one sleep left in the changed helpers is now commented.
  - The test's `canvas_loading.wait_for_absent()` stays. Moving it into the helper is deferred item D.
- **Screenshots:** not added. Neither component is covered only by these tests: `test_workflow_management.py` already has about 9 `screenshot()` calls, and the editor and run form have many.
- **Kept:** the explicit `workflow_index_open()` in `test_workflow_bookmark_and_delete_by_exact_title`. The red check needs it.

## Tests run

All runs used the post-change tree:
- one test at a time
- a scratch context config without `login_email`/`login_password`, so each test registered a fresh user
- Galaxy on 8081 (scratch config bind) and Vite on 5181, since another session held 8080, 5173 and 5174

Every process started was then killed by PID, and the temp configs were deleted. The worktree is clean.

| Test | Backend | Result |
|---|---|---|
| `test_workflow_bookmark_and_delete_by_exact_title` | Playwright | PASS (21s) |
| `test_workflow_bookmark_and_delete_by_exact_title` | Selenium | PASS ×3 (19s, 27s, 25s) |
| `test_workflow_delete` | Playwright | PASS (15s) |
| `test_workflow_delete` | Selenium | PASS (27s) |
| `test_open_and_run_workflow_by_exact_title` | Playwright | PASS (11s) |

pre-commit (black, ruff, flake8, prettier, …) passed on both fixups. `git merge-tree --write-tree` is clean against `workflow_editor_run_cancel` and `workflow_editor_second_subworkflow`.
