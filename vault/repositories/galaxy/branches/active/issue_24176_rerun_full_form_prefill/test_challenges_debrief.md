# Test challenges debrief (round 2, after re-scope)

I changed one test and kept the rest. `test_run_form_input_steps_carry_request_input_keys` now reads `step.get("step_effective_label")` (`8195f1794b1`). Without the branch, it now fails at its own assertion instead of with a `KeyError`. It passes under the lock. I dropped no tests, changed no implementation code, and left the exported client surface (`withRerunValues`, `rerunInputValue`, `mountRerun`, `step_effective_label`) untouched. I red-checked the re-scope's three new unit and client tests by turning off the behaviour each one guards. All three fail at that behaviour.

Not acted on:
- **#24177 duplicates the rerun mount helper.** Its `WorkflowRun.test.js` defines a nested `mountRerun(runData, rerunRequest)` at line ~162. That copy shadows the shared `mountRerun(props, runData)`, takes its arguments in the opposite order, and repeats the unmount, mock and mount setup. #24177 should call the shared helper. This is #24177's change to make, not this branch's.
- **`test_request_input_labels` imports the private `_request_input_labels`. Kept.** API and `yaml_to_model` can't create legacy input rows, because `save_to_step` rewrites `tool_inputs`. That leaves this pure-function test as the only way to cover the duplicate-name guard.
- **The `mountRerun` double unmount and the rerun wrappers that are never unmounted. Kept.** The re-scope review already declined these as a nit. I re-ran the file and Vue raises no warnings. Changing the helper would also put the sibling's imports at risk.
- **`mountRerun` uses `mount` plus stubs instead of `shallowMount`, which the client README prefers. Kept.** The point is the same as above: #24177 builds on the helper, and both forms are already stubbed.
- **The API contract test can't tell `step_effective_label` apart from `step_label`.** For workflows saved by current Galaxy the two are equal, so the test would still pass if the server sent `step.label`. It only pins two things: the field is present, and label-or-index pairs with the `/request` keys. Legacy and duplicate-name behaviour is covered by `test_request_input_labels` and the `model.test.js` legacy case.

<details>
<summary>Full challenge notes</summary>

## Scope

Merge base: `b53a5d9fe8b` (`issue_24178_subworkflow_step_params_export`). Round 1's debrief is `earlier_drafts/1/test_challenges_debrief.md`. Its keeps aren't reopened here: the six `test_run_form_seed*` API tests, `rerunHasStepParameters`, the `FormDisplay` lookup by order, and the `WorkflowRunForm.test.ts` prefill test.

## Tests that are new or changed since round 1

| Test | Verdict | Red check |
|---|---|---|
| `test_recover_step_parameters_skips_unusable_rows` (unit) | Keep. It's the only coverage for the skip-on-`ValueError` policy, because the API can't write malformed rows. The parent's tests cover the resolver itself, not this skip loop. The valid subworkflow row is the positive control. | I removed the `try/except ValueError` from `recover_step_parameters`. The test then fails with `ValueError: invalid literal for int() ... 'num_lines'`. If the type filter is removed, the resolver's `assert` fires on the replacement row (reasoned, not run). |
| `test_request_input_labels` (unit) | Keep. It's a pure function, so it needs no mocks. Legacy rows exist only here. | I removed the `Counter` dedup. The test then fails with `At index 2 diff: 'Input Dataset' != None`. |
| `test_run_form_input_steps_carry_request_input_keys` (API) | Keep, **changed** to use `.get("step_effective_label")`. It uses the existing populators (`load_workflow`, `invoke_workflow_and_assert_ok`, `invocation_to_request`) and the file's `_run_form_steps` helper. | Reasoned against the parent: without the field, `[None, None] != [None, "WorkflowInput2"]`, and the key set is `{"0","1"}` instead of `{"0","WorkflowInput2"}`. Before the change, the first failure was a `KeyError`. |
| `model.test.js` `rerunInputValue` legacy case | Keep. | I changed the label read to `step.step_label` only. The test then fails with `expected undefined to be 'c'`. |
| `model.test.js` `""` positional case | Keep. `step_effective_label: ""` is realistic: `recover_inputs` keys a step labeled `""` under `""`. | It isn't new behaviour (the fallback predates this branch). |
| Hoisted `mountRerun` in `WorkflowRun.test.js` | Keep. Both rerun tests use it, and both stub the two forms. | Round 1 checked the guard test red. Re-scope moved the helper without changing it. |

Note: on the parent, these unit and client tests would only fail with `ImportError`/`AttributeError`, because they exercise symbols this branch adds. That's why I red-checked them by turning off the behaviour each one guards. All of those edits were temporary and were reverted with `git checkout -- <file>`, without using a stash.

## Whole branch, briefly

- **API seeding tests:** unchanged since round 1, and still the right layer for this work.
- **`test_run_form_seeded_from_imported_invocation`:** load-only by design until #24175 or #24176 lands second (settled).
- **E2E:** round 1 recommended handing E2E to #24177. That is now superseded: this branch has its own `test_workflow_rerun_prefills_expanded_form` (added and polished after round 1). Reasoned red: without seeding, `num_lines` is a runtime input with no saved value, so the `"3"`/`"2"` previews and the `seedme == "moo"` check would fail.
- **Python unit tests:** no mocks or `SimpleNamespace` to replace. They build real models with `yaml_to_model`.
- **Client tests:** they mock only the `getRunData` API boundary.

## Commands run

- Unit `test/unit/workflows/test_run_parameters.py`: 15 passed. Red edits: 2 failed as described above, then reverted.
- vitest `src/components/Workflow/Run/`: 11 files, 77 passed. With the `model.js` red edit, 1 failed, then reverted.
- API, under the lock with the sandbox disabled: `test_run_form_input_steps_carry_request_input_keys`, 1 passed (after the change).
- Pre-commit hooks (black, ruff, flake8) passed on the commit.

</details>
