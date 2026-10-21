# Baseline refactor — workflow_editor_second_subworkflow

Split the helper commit. The Workflows-panel helper hardening (navigation.yml targets, exact-title card actions, real waits in place of sleeps) now sits on base as its own refactor commit. The fix commit is down to the panel guard plus `search.clear()`.

Base `65132d40dac` (`release_26.2`). Head `ad783d6d3e9` (was `57292ea0b65`). The final tree is unchanged: `d644a83853c` before and after.

| New | Old | Commit |
|---|---|---|
| `d86b65c6487` | (part of `7e681e52e13`) | Target editor Workflows panel cards by exact title |
| `fb6fc797919` | `7e681e52e13` | Insert a second subworkflow from the editor's Workflows panel (original message) |
| `ad783d6d3e9` | `57292ea0b65` | Test inserting two subworkflows from the editor's Workflows panel (cherry-picked unchanged) |

## Refactor commit (`d86b65c6487`)

This commit changes no behaviour for the existing callers (`setup_subworkflow`, `test_editor_insert_steps`):

- Adds the `workflow_editor.workflow_activity_search` and `workflow_activity_list` selectors.
- Adds `_workflow_editor_panel_card_action` and `_workflow_editor_panel_card_titled`. `add_steps` and `add_subworkflow` now click the action inside the card titled exactly NAME, where before they clicked the first card action in the panel after a sleep.
- Replaces the post-open sleep with a wait for the search input to be visible.
- `add_subworkflow` now waits for the node to be visible. Before, it waited for the node to be present and then slept.
- `add_steps` keeps its sleep, with a comment.
- The tooltip hover moves to the search input in this same commit, because dropping the sleep is what makes the old list hover land on a badge tooltip.
- `workflow_editor_search_for_workflow` still clicks the activity unconditionally and doesn't clear the search, so the base bug is left in place on purpose.

## Fix commit (`fb6fc797919`)

5 added lines and 1 removed. It adds the `workflow_activity_panel` selector with its only user, the `is_absent` guard with its toggle comment, and `search.clear()`. Its message is unchanged and still accurate.

## Checks

- Pre-commit hooks ran on both new commits: all passed.
- E2E tests at the refactor commit: I checked out that commit's helper files with the branch still checked out. Playwright, Galaxy on 8081, Vite on 5181, scratch context with no login. One test at a time:
  - `test_editor_embed_workflow`: PASS (25s)
  - `test_editor_insert_steps`: PASS (41s)
  - `test_editor_embed_two_workflows`: FAIL, as expected. The second insert toggles the panel closed, so it times out waiting for the panel search input. This confirms the fix lives in `fb6fc797919`.
- At HEAD: `test_editor_embed_two_workflows` passes on Playwright (11s).
- `git merge-tree --write-tree` against `workflow_editor_run_cancel` and `workflow_open_exact_title`: both clean.
- Cleanup: I killed every process I started by PID and deleted the temp config files. No Galaxy, celery or Vite processes are left under this worktree, and the worktree is clean. A local backup ref, `backup/second_subworkflow_pre_baseline`, points at the old head `57292ea0b65`.
