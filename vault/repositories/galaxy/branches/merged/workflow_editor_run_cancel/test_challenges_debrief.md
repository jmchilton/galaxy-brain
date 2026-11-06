# Test challenges — workflow_editor_run_cancel (re-harden, scope B)

All tests on this branch are E2E tests in `test_workflow_run.py`. There are no unit, Vitest, API or integration tests, so there was nothing to drop or move to another layer. I made one change: I strengthened `test_execution_with_custom_invocation_report` so the new File-input selection is also pinned on the expanded run form.

## Change

- **`test_execution_with_custom_invocation_report`** now checks which datasets the invocation used. It maps the invocation's `inputs` by label and asserts `input_1` is "my bed file" and `image_input` is "my input image".
  - Why: the scope-B helper fix (`workflow_run_setup_inputs` now returns `type: File` data) was red-pinned only on the simplified form, by the decoy in `test_execution_with_multiple_integer_parameter`. No expanded-form caller asserted anything about its File selections.
  - No decoy is needed. Both inputs are untyped `data`, so the form gives them the same preselected default. Two distinct names can only come from real selections.
  - Red, run under Playwright with the pre-fix `framework.py` from `0cd95541b31` restored temporarily: `AssertionError: input_1 got 'my input image'`. Green on the branch.
  - Uses the test data that was already there, keyed correctly (`input_1`, `image_input`). It doesn't depend on the pending fixture-key commit `0cd95541b31`.
  - Folded into "Select File inputs in workflow_run_setup_inputs" with an autosquash rebase onto `0cd95541b31`. The SHAs up to and including `0cd95541b31` are unchanged. New head: `ef50f96de47`, which replaces `6b83ea97e49`.

## Checklist

- **Best practices.** Reviewed `doc/source/dev/writing_tests.md` and the vault notes "Component - E2E Tests - Writing" and "Smart Components". The tests follow them:
  - `@managed_history`.
  - Setup goes through populators. The UI is used only for the flow under test.
  - Selectors live in `navigation.yml`. `invocations.cancel_button` uses `data-description`.
  - Reusable steps live in `NavigatesGalaxy` and `RunsWorkflows`.
  - Retry assertions instead of `sleep_for`.
  - No direct driver calls.
- **Unit and Vitest tests.** None. Extracting the `label_map` to `inputs` transform into a pure function just to unit-test it would test the implementation directly, so I didn't.
- **API helpers.**
  - Verification uses `workflow_populator.history_invocations` / `get_invocation` and `dataset_populator.get_history_dataset_details`. There are no raw HTTP calls.
  - The cancel test's custom `_wait_on` is justified. `wait_for_invocation`/`wait_on_state` counts `scheduled` as an ok state, so it would return before the cancel lands. `cancel_invocation` doesn't apply, because the cancel goes through the UI.
  - The API suite's `_wait_for_invocation_state` is private to `test_workflows.py`. With a single use here, promoting it isn't worth it.
- **E2E coverage.** Present. `test_run_from_editor_and_cancel` covers the new flow: the editor's Run activity, the simplified form selection and the Cancel button.

## Red without branch changes

There is no "Baseline tests" commit. Each new test needs the helper fixes, and the fixture-key commit is ordered first so that it stays green on the old helper.

- **`test_run_from_editor_and_cancel`:**
  - With 4b reverted, it times out on `[step-label='input1'] .multiselect`.
  - With 7h reverted, it times out on `#workflow-run-button`.
  - Without 7j there is no `cancel_button` selector.
  - These failures happen inside the helper under change or at a missing selector, not at the test's own id assertion. That's acceptable here: the helpers are the code being fixed, and a new E2E test has to come with its selectors. The preselection decoy (`newest`) keeps the id assertion meaningful. The old behaviour of "select nothing" can't pass it.
- **`test_execution_with_multiple_integer_parameter` (decoy).** Red on the pre-fix helper at its own assertion, "run form kept the preselected newest dataset". This is from the rescope run.
- **`test_execution_with_custom_invocation_report` (new assertion).** Red on the pre-fix helper at its own assertion, as shown above.
- **`test_execution_with_images_in_report`.** No new assertion. Its only change is the pending fixture key.

## Runs

- Playwright, headless, Vite 5173 against this worktree's Galaxy: `test_execution_with_custom_invocation_report` passed on the branch and failed as expected on the pre-fix helper. These were the only E2E runs. No other test changed in this pass.
- The pre-commit hooks (black, ruff, flake8) passed on the fixup.

## Not acted on

- **Decoy-style check on `test_execution_with_images_in_report`.** It would depend on the pending fixture-key commit, and adding a decoy would mean splitting `workflow_run_and_submit`. The custom-report assertion already covers the expanded File path.
- **Returning `inputs` from `workflow_run_and_submit`.** That would touch 6 callers for one assertion.
- **`"{hid}: "` prefix collision.** Still latent; hids stay low under `@managed_history`.
- **The "Loading step state summary" wait before Cancel.** It has no inline comment. It's needed for the "running" screenshot and for the cancelled note, which renders only once `stepCount` has loaded. Left as is.
