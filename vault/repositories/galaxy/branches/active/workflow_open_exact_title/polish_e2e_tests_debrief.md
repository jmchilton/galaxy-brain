# Polish E2E tests debrief — workflow_open_exact_title

The polish pass found a real regression in the exact-title helpers and fixed it. Matching now prefers the card titled exactly NAME and falls back to the only card whose title contains NAME. The new test and the existing callers pass under both backends.

Branch is still on base `65132d40dac`. Fixups were autosquashed and nothing was pushed:

1. `d60eed7c1f2` Open the workflow titled NAME in workflow_index_open_with_name (7c)
2. `33657ae52fe` Open the run form of the workflow titled NAME in workflow_run_with_name (7g)
3. `d6bce3fc3e8` Test opening and running a workflow whose title prefixes another's (unchanged)

## Regression found

`workflow_create_new` keeps the "Unnamed Workflow" placeholder by default (`clear_placeholder=False`). The real title is therefore `Unnamed Workflow<name>`, and the helper returns only `<name>`. `test_edit_name` also appends a new name onto the old one. The strict `title == name` matcher never matches these cards, so `create_and_wait_for_new_workflow_in_editor` + `workflow_index_open_with_name`/`workflow_run_with_name` times out. That combination is used across most of `test_workflow_editor.py`.

- Playwright before the fix: `test_edit_name` failed, timing out waiting on "a workflow card titled [new_name]". The screenshot showed the single card titled `Unnamed Workflow…`. `test_parameter_regex_validation` also failed.
- The test-challenges pass only ran the new test, which is why this slipped through.
- **`galaxy_ui_driver` has the identical bug in its 7c.** I left that worktree alone. The coordinator should decide whether to port this fix there.

## Fix (folded into 7c; 7g docstring updated)

`_workflow_card_named(name)` returns the card titled exactly `name`. If none is, it returns the single card whose title contains `name`. If several cards contain it, it keeps waiting, so the timeout message now says "titled or uniquely containing".

- The new test still discriminates. `NAME` and `NAME (copy)` both contain NAME, and the exact match wins. With the fix reverted, the old helper clicks the first card, which is `(copy)`.
- Theoretical gap: if the list ever rendered `NAME (copy)` without `NAME`, the fallback would pick it. Both cards come from the same API response, so the risk is low.
- Rejected alternative: making `workflow_create_new` clear the placeholder by default. That changes a widely shared helper and still leaves `test_edit_name`'s appended name broken. Fixing it would mean editing the test, which sibling branches also touch.

## Polish checklist

- **Selectors:** all go through navigation.yml: `workflow_card`, `workflow_card_title`, `edit_button`, `run_button`, `canvas_body`, `canvas_loading`, `edit_name` and `run_workflow`. There are no raw CSS selectors left in the branch.
- **`canvas_loading`:** the line is byte-identical to the one on `workflow_editor_run_cancel` and sits right after `canvas_body`. Only the line offset differs.
- **Shared abstractions:** `_workflow_card_action(name, Target)` already serves both helpers. Nothing new was needed.
- **Sleeps:** the test has none.
  - It waits for `canvas_body` to be visible and then for `canvas_loading` to be absent.
  - There is no race: `loadingWorkflow` is set by an immediate watcher (`Index.vue` ~L506) before the first render, so the shade exists by the time the canvas is visible.
  - The `sleep_for(UX_RENDER)` in `workflow_run_with_name` was already on base, and many callers rely on it. I left it so sibling branches still merge cleanly.
- **Screenshots:** not added. The workflow editor and run form already have many screenshot-capturing tests.

## Tests run (one at a time, local Galaxy + Vite 5173)

Before the fix:
- Playwright: `test_open_and_run_workflow_by_exact_title` passed (validates the `workflow_card_title` switch). `test_workflow_run.py::test_simple_execution` passed. `test_edit_name` and `test_parameter_regex_validation` failed (see above).
- Selenium: `test_open_and_run_workflow_by_exact_title` passed.

After the fix:
- Playwright: `test_edit_name`, `test_parameter_regex_validation`, `test_simple_execution` (which goes through `workflow_run_open_workflow` → `workflow_run_with_name`) and `test_open_and_run_workflow_by_exact_title` all passed.
- Selenium: `test_open_and_run_workflow_by_exact_title` and `test_edit_name` passed.
- Pre-commit hooks (black, ruff, flake8) passed on the fixups.

## Notes for coordinator

- The SHAs in `index.md` and the other debriefs are stale. The head is now `d6bce3fc3e8`.
- The commit messages still say "titled NAME". The docstrings describe the fallback. A reword is optional.
