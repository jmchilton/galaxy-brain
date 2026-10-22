# Test challenges debrief

Kept all 5 unit tests. Swapped their hand-built step stubs for the shared Editor step builder. Added a Selenium/Playwright E2E test for the user-visible symptom: the extract fix never cleared the lint warning. Nothing was dropped or weakened.

Commits on `untyped_param_lint_declared_labels` (not pushed):
- `5483c3999e3` Build untyped parameter test steps with createTestStep
- `8a932a4da04` Add E2E test that extracting an untyped rename parameter clears lint

## Unit tests (`modules/parameters.test.ts`)

All 5 kept. Each one tests a distinct rule through the public function with no mocks:

| Test | Rule | On base `0073b5e9224` |
|---|---|---|
| flags rename with no matching input | control | passes |
| skips rename filled by parameter input | declared label skipped | **fails**: `['sample']` vs `[]` |
| flags only undeclared names in mixed rename | per-name skip | **fails**: `['sample','replicate']` vs `['replicate']` |
| flags tool state even with matching input | tool state not exempt | passes (control) |
| ignores non-rename PJA args | rename-only scan | **fails**: `['sample']` vs `[]` |

Each red failure happens at its own assertion. It is not caused by an import or type error.

- Rewrite: removed the `as unknown as Step` stubs. Extended `createTestStep` in `Editor/test_fixtures.ts` instead:
  - new optional `type`, `label`, `configForm` and `postJobActions` options
  - it now returns `Step`, since it always sets `id`
- The existing callers (`layout.test.ts`, `workflowStepStore.test.ts`) are unchanged and still pass.
- Didn't add a rename PJA to the shared `lint_steps.json`, because that would shift the counts in `useLinting`/`Lint`.
- No refactor of `parameters.ts` was needed. The function is already pure over `Steps`.

### Baseline ordering (not done; coordinator call)

The process wants the 2 control tests in a leading "Baseline tests" commit, because they pass without the change. Today they share commit `6bb6d2cab4d` with the fix. I was told to commit on top, so I didn't rewrite history.

Suggested reorder:
1. Commit `parameters.test.ts` with only the 2 controls, plus the `test_fixtures.ts` builder change, as "Baseline tests for getUntypedWorkflowParameters".
2. Then the fix plus the 3 red tests.
3. Then the E2E.

## E2E (`test_workflow_editor.py::test_best_practices_extract_untyped_rename_parameter`)

What it does:
1. Reuses `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM`, where the rename is `${replaceme} suffix`.
2. Opens the best practices panel and asserts the "formal inputs" section is `warning` with a `replaceme` item.
3. Clicks the fix and confirms.
4. Asserts the section turns `ok`.

New selectors `section_formal_inputs` and `item_formal_input` in `navigation.yml` mirror the existing best_practices entries.

- Uses `auto_layout=False`. Auto layout marks the workflow unsaved, so `onAttemptRefactor` would insert a second "save changes and continue?" confirm.
- Green: passed under both Playwright and Selenium against this worktree's own Galaxy and Vite.
- Red: run with `parameters.ts` reverted to base. The refactor ran (a `replaceme` text input was added), but the section stayed `warning` and the test failed at the final `assert 'warning' == 'ok'`. That is the reported bug.

- Flake risk, unaddressed: loading briefly marks the workflow changed (see comment near line 138), and while it is marked the lint fix link is disabled. If CI flakes on the confirm wait, add `editor.canvas_loading.wait_for_absent()` after opening. The test passed in all 3 green runs without that wait.
- How it was run:
  - borrowed `extract_next_followups/.venv` with `PYTHONPATH=lib` and `pytest -p no:asyncio`
  - this worktree's own gunicorn on 8197 and Vite on 5197, with `GALAXY_TEST_EXTERNAL=http://localhost:5197/`
  - no `GALAXY_TEST_END_TO_END_CONFIG`
  - Selenium used chromedriver from selenium-manager

## Other checks

- vitest under node 22.20.0 with `--no-experimental-webstorage`: `src/components/Workflow/Editor` plus `stores/workflowStepStore.test.ts`, 382/382 passed in 38 files.
- eslint, prettier, `vue-tsc --noEmit` and the pre-commit hooks are all clean.
- No API, integration or helper challenges apply; the branch has no backend tests.
