# Baseline refactor: workflow_editor_run_cancel

No refactoring of the base branch was performed.

Reviewed `65132d40dac..2645a2f7476` (4 commits, base `release_26.2` `65132d40dac` kept). History unchanged. No SHAs rewritten.

## Why nothing was split out

The branch is already ordered helpers-first, test-last. Each helper commit is part of the core fix, not a refactor that could land ahead of it without changing behavior:

- `6b639d732b9` (`workflow_run_specify_inputs`): changes behavior. It now waits for the run form, then picks the simplified-form selector (`input_select_field`) or the expanded one (`input_data_div`). On the base, the expanded-form path is the only one, and the change is that dispatch.
- `7078f4c023a` (`workflow_editor_click_run`): changes behavior. It replaces a selector that is dead on 26.2 (`#workflow-run-button`) with the Run activity (`tool_bar.run`). Its `navigation.yml` entry is added in the same commit, and the commit needs it.
- `831de3dd1a8` (`invocations.cancel_button`): adds a selector only, already in its own commit. Moving it earlier would gain nothing.

The only leftover is the two one-line docstrings. Splitting them into their own commit would be churn. The shared "form mode" helper that `thermo_nuclear_review.md` deferred (the repeated `run_workflow` visible + `expanded_form.is_absent` check in `workflow_run_ensure_expanded` and `workflow_run_specify_inputs`) would be a genuine pre-fix refactor. It stays deferred: `navigates_galaxy.py` is shared with sibling branches, and keeping this branch independently mergeable matters more.

## Baseline tests convention

Doesn't apply. The branch adds no new test file or new set of unit/API tests for an existing component. Its only test is one E2E flow (editor Run activity → simplified form → Cancel), and that flow can't pass on the base: `#workflow-run-button` is gone, the simplified form has no `step-label`, and there is no `cancel_button` selector. The expanded-form path of `workflow_run_specify_inputs` is already exercised by existing callers (`workflow_run_and_submit`, other tests in `test_workflow_run.py`).

## Tests

No code changed, so no E2E run. The last run, recorded in `thermo_nuclear_review.md` against the current head `2645a2f7476`, was 1 passed under Playwright.
