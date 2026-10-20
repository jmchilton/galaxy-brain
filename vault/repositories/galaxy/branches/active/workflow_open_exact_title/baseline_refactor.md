# Baseline refactor — workflow_open_exact_title

A new first commit on the base pulls the shared `_workflow_card_action(name, action: Target)` out of `workflow_index_open_with_name` and `workflow_run_with_name`, and changes no behavior. The 7c and 7g fixes are now one commit on top of it.

## History

The base stays at `65132d40dac` (`release_26.2`); no rebase onto newer origin. Nothing was pushed. Old head: `ef801975de9`.

| New | Old | Commit |
|---|---|---|
| `8a367e63730` | (new) | Extract _workflow_card_action from the open/run-by-name workflow helpers |
| `3a1cab1b33b` | `8080d4b4110` (7c) + `2d4461ed6fc` (7g) | Open the workflow card titled NAME in the open/run-by-name workflow helpers |
| `de0dae90db7` | `ef801975de9` | Test opening and running a workflow whose title prefixes another's |

`git diff ef801975de9 de0dae90db7` is empty, so the final tree is byte-identical and the merge picture with sibling branches hasn't changed.

## Refactor commit

- `_workflow_card_action` does what both helpers repeated: `workflow_index_open()`, then `workflow_index_search_for(name)`, then `self.wait_for_and_click(action)`.
- Callers pass `navigation.workflows.edit_button` / `run_button`. `workflow_run_with_name` keeps its trailing `UX_RENDER` sleep.
- It is exactly behavior-preserving:
  - `self.components` is `SmartComponent(self.navigation, self)`.
  - So `components.workflows.X.wait_for_and_click()` resolves to `self.wait_for_and_click(target)`, including the same `@retry_during_transitions` decorator.
- It needs no new imports, since `Target` was already imported on base. No docstrings were added, because the current ones describe the exact-title semantics and belong with the fix.

## Fix commit (7c + 7g fused)

After the extraction, one helper edit fixes both callers, so a separate 7g commit would have had nothing left to change. The fused commit:

- adds the `_workflow_card_named` wait and the `retry_call_during_transitions` wrapper
- adds the docstrings on both public helpers (this includes 5d's run docstring, which 7g originally brought along)

It keeps 7c's author date, and the message is rewritten to cover both helpers. **When dropping 7c/7g from `galaxy_ui_driver`, this single commit replaces both.** The earlier "only 7g reverted → run form opens sibling's id" evidence is still valid, but it is no longer a single-commit revert.

## Baseline tests convention

Not applicable:

- The new E2E test fails on base by design (it's the red check).
- The unit test file was already dropped with John's approval.
- `test_edit_name` already pins the base open-by-name path.

## Verification

- Pre-commit (sample config) clean on `navigates_galaxy.py` at both the refactor commit and the fix commit.
- Playwright, headless, at new head `de0dae90db7`, one at a time against this worktree's Galaxy and Vite (both stopped afterwards):
  - `test_open_and_run_workflow_by_exact_title`: passed (96s)
  - `test_edit_name`: passed (52s)
