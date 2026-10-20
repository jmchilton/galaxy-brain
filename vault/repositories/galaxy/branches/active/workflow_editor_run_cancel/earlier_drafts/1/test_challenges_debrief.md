# Test challenges — workflow_editor_run_cancel

Branch adds one E2E test, `test_workflow_run.py::TestWorkflowRun::test_run_from_editor_and_cancel`, and the three helper/selector fixes it needs. No unit, Vitest, API or integration tests. Nothing to drop or rewrite at another layer.

## Changes

- Strengthened the E2E test. It checked the cancellation only through the API, so it never showed that the UI reflects it. It now also waits for the invocation page's steps note to read "Invocation scheduling cancelled". Uses the existing `invocations.progress_steps_note` selector and the retry-assertion pattern from `test_workflow_invocation_details.py`. Retry budget is widened (50 x 0.2s) because the page polls every 3s.
- Folded into the test commit: `4a0abaaaa0f` -> `0bf7f6d3af7`. The earlier commits are unchanged.

## Challenges considered, no change

- **E2E coverage**: the feature is a UI flow (editor Run activity, simplified run form, Cancel button), so E2E is the right layer. The test exists.
- **Best practices** (`writing_tests.md`, vault E2E notes): `@managed_history`. Setup goes through the API (populators, YAML upload). UI is used only for the flow under test. Selectors live in `navigation.yml` (`tool_bar.run`, `invocations.cancel_button`, which uses `data-description`). Reusable steps live in `NavigatesGalaxy`. There is no `sleep_for`. It is backend-agnostic, with no direct driver calls.
- **API helpers**: verification uses `workflow_populator` (`wait_for_history_workflows`, `history_invocations`, `get_invocation`). There are no raw HTTP calls.
- **Race check**: the click fires the DELETE asynchronously, so the API wait could see `scheduled` before the cancel lands. The assert is still safe. The 300s job keeps `wait_for_history_jobs` blocked until the scheduler handles `cancelling`, and the scheduler deletes the jobs and marks the invocation `cancelled` in one commit. In the UI, `cancelWorkflowScheduling` writes the DELETE response (`cancelling`) to the store. That makes scheduling non-terminal again, and the component's watcher restarts polling.
- **Red without branch changes** (reasoned, per process): reverting 4b times out on the `step-label` field. Reverting 7h times out on `#workflow-run-button`. Without 7j there is no `cancel_button` selector. The newly added UI assertion depends on the same flow, so it can't pass without these changes either.
- `assert workflow_run.expanded_form.is_absent` stays. It pins the premise that the simplified form was exercised. That form is the path the 4b fix is about.

## Run

- Playwright, headless, Vite 5173 against this worktree's Galaxy: **1 passed** (116s).
- Pre-commit (black, ruff, flake8) passed.

## Not acted on

- The `workflow_run_setup_inputs` / `label_map` gap noted in the initial debrief: existing callers select nothing, and pass only because the form preselects the newest dataset. That affects other tests and is out of scope here. It is still a follow-up.
