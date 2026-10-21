# Baseline refactor — workflow_open_exact_title

The base keeps pass 1's `_workflow_card_action` extraction (`8a367e63730`, unchanged). This pass moves the dead-assignment cleanup in the undo/redo test down to sit right after it, followed by the Playwright `find_elements` snapshot fix, a prerequisite driver fix rather than a refactor. The feature commits now stack on that three-commit prefix. The final tree is unchanged.

## History

Base `65132d40dac` (`release_26.2`); no rebase onto newer origin; nothing pushed. Old head `dc01d33b2bd`, new head `fc5802715a1`. `HEAD^{tree}` is `6893e0a4f90` before and after.

| # | New | Old | Commit | Kind |
|---|---|---|---|---|
| 1 | `8a367e63730` | `8a367e63730` | Extract _workflow_card_action from the open/run-by-name workflow helpers | refactor (behaviour-preserving) |
| 2 | `f74b6388807` | `cf092c49e24` (was 5th) | Drop dead workflow name reassignment in undo/redo test | cleanup (behaviour-preserving) |
| 3 | `28152858a04` | `dc01d33b2bd` (was HEAD) | Snapshot Playwright find_elements instead of count then nth | prerequisite driver fix |
| 4 | `42c233bfb95` | `55f2a4f725b` | Open the workflow card titled NAME in the open/run-by-name workflow helpers | fix |
| 5 | `eaf5af509d3` | `c762cce5a0d` | Test opening and running a workflow whose title prefixes another's | test |
| 6 | `6bf5076a289` | `f4029b4e418` | Delete and bookmark the workflow card titled NAME | fix |
| 7 | `fc5802715a1` | `01d44d38453` | Test bookmarking and deleting a workflow whose title prefixes another's | test |

The three moved commits touch disjoint files (`test_workflow_editor_undo_redo.py`, `has_playwright_driver.py`), so the reorder applied without conflicts. Commits 1–3 apply to the base on their own and could become their own PR.

## Why each prefix commit moved

- **Dead assignment (2).** `name = self.workflow_index_open_with_name(name)` rebinds `name` to `None`, and nothing reads it afterwards. That's true on the base too, so the cleanup doesn't depend on the fix.
- **`find_elements` snapshot (3).** This isn't a refactor: it changes `find_elements` for every Playwright caller. In the normal case, where the list is stable, the result is the same. When the list shrinks between `count()` and `nth(i)`, it removes a 30s stall. Placing it under the fix means `_workflow_card_named`'s `.all()` polling during the search re-render gets snapshot semantics from the first commit that uses it, so the fix commits never run with the stall. Neither sibling branch touches `has_playwright_driver.py`.

## Considered, not done

- **Routing delete/bookmark through `_workflow_card_action` on the base.** On the base, `workflow_delete_by_name` / `workflow_bookmark_by_name` don't call `workflow_index_open()`. They search whatever page is current. Routing them through the helper adds a navigation step, so it isn't behaviour-preserving. Changing `_workflow_card_action` to return the card only serves the card-scoped delete item, so it stays with that fix.
- **Splitting `_workflow_card_named` or the retry wrapper into a base refactor.** Neither one has a base caller without the exact-title semantics.

## Baseline tests convention

Not applicable:

- Both new E2E tests (`test_open_and_run_workflow_by_exact_title`, and the bookmark/delete prefix test in `test_workflow_management.py`) fail on the base by design. They're the red checks.
- `test_edit_name` and the existing bookmark/delete management tests already pin the base by-name paths.

## Verification

All checks below ran at prefix top `28152858a04` (branch reset there, then back to `fc5802715a1`). One E2E run covers the three-commit prefix together, not each commit separately. Pass 1 only ran E2E at head, so this run is the first E2E check of the extraction on its own.

- `pre-commit run --config .pre-commit-config.yaml.sample` on `navigates_galaxy.py`, `has_playwright_driver.py` and `test_workflow_editor_undo_redo.py`: all hooks passed.
- `pytest test/unit/selenium/test_has_driver.py -k find_elements`: 12 passed.
- Playwright, headless, one test, `test_workflow_editor_undo_redo.py::TestWorkflowEditorUndoRedo::test_editor_change_stack_set_attributes`: passed in 25s. It exercises the extracted `workflow_index_open_with_name`, the line commit 2 edits, and Playwright `find_elements`. It ran against a Galaxy started from this worktree on 8081 and Vite on 5181, with a scratch context that had no login credentials, so the test registered a fresh user. Both servers were stopped by PID afterwards.
- `git merge-tree --write-tree` against `workflow_editor_run_cancel` (`c8cb2969ae3`) and `workflow_editor_second_subworkflow` (`17d2877fc99`) gives a clean merge, and the result trees are identical before and after the reorder.
