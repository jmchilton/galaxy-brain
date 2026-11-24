# Test challenges debrief — PR #25002

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `8dd9549cab94b9b3568b098fcc02255faecfcead` (base merge-base `6864679ef0b0`)
- Tests not run: worktree has no `.venv` or `client/node_modules` (not bootstrapped). Assessment is by reading.

## Inventory and verdicts

| Test | Layer | Verdict |
|---|---|---|
| `rename_from_step_input.gxwf.yml` | framework | Keep. Core feature end to end. |
| `rename_from_step_input_values.gxwf.yml` | framework | Keep. Integer, default-only input, unset optional. Also exercises the `map_over.py` default-only guard. |
| `rename_from_step_input_when.gxwf.yml` | framework | Keep. Covers the new `elif step_input.connections / else default` branch in the `when` path. |
| `rename_from_tool_parameter.gxwf.yml` | framework | Keep. Only covers the tool-state path, see recommendation 2. |
| `test_run_rename_from_step_input_on_mapped_over_collection` | API | Keep. Collection name, element name and unchanged stored PJA need the API. |
| `test_run_rename_from_data_input_does_not_wait_for_upstream_job` | API | Keep. Paused-state check can't be done in a framework test. `hid=5` and the `in ("scheduled", "completed")` check follow the existing pattern in this file (e.g. ~L3328, L4067). |
| `test_run_rename_from_step_input_fails_on_collection_of_values` | API | Keep. Checks the failure reason and message. |
| `test_rename_step_input_references` (unit) | unit | Keep. A pure function. The "never expanded again" case is awkward to reach any other way. |
| `test_format_step_input_reference` (unit) | unit | Keep. A pure helper and a cheap parametrized test. The `str`, `int`, `None` and HDA cases overlap framework/API tests. The bool, float and list cases are only checked here. See recommendation 3. |
| `terminals.test.ts` rename reference `canAccept` | vitest | Keep. Model logic, no mounting or mocks, matches the file's style. |
| `workflowStepStore.test.ts` `getCombinedStepInputs` | vitest | Keep. Port derivation, a tool-state override and a gate/rename name collision. No mocks. |
| `test_rename_from_connected_step_input` | selenium | Keep. Covers adding the port, connecting, save, reload and run. The run tail repeats the `rename_from_step_input` framework workflow, but it shows that an editor-saved workflow (with a connection-only extra input) also runs. |

There are no mocks, `SimpleNamespace` objects or layout faking to challenge. The Playwright video commit is opt-in test infrastructure with no dedicated tests, which is fine.

Both API tests use existing helpers (`_run_workflow`, `download_workflow`, `get_invocation`, `get_history_collection_details`). No HTTP call is repeated in a way that needs a new helper.

## Test plan (recommendations)

1. **Cover `validInputTerminals()` using the combined step inputs** (`terminals.ts` ~L813). This behavior change has no test. `validInputTerminals()` is used only by `ConnectionMenu.vue`, the keyboard connection menu. The Selenium test connects by dragging, so it does not reach this path. A vitest next to the existing `"can accept new connection"` case (~L1111 in `terminals.test.ts`) would do. Add a step with a `$(inputs.sample_name)` rename (or a `when`) and assert that a text parameter output's `validInputTerminals()` includes a terminal named `sample_name`. Without the change it fails at that assertion (red-to-green).
2. **Tool parameter connected rather than set in state.** `_referenced_step_input_values` has a separate branch for a non-data tool input: it calls `replacement_for_input` and then `replace_expression_json_dataset`. The framework test only covers the value coming from `state`. If the parameter is connected to a `param_value_from_file` output, the expression.json unwrap is what turns the value into the number instead of a dataset name. Nothing covers it. Add a framework test: `head` with `lineNum: lane_param/integer_param` connected and rename `first_$(inputs.lineNum)`.
3. **Boolean formatting at the workflow layer.** The PR description promises `true`/`false` for booleans, which differs from Python's `str(True)`. Only the unit test checks it. Connect a boolean workflow input (or a `param_value_from_file` boolean) to a rename reference in `rename_from_step_input_values` and assert the name. Optional: once that is covered, the unit cases already covered by framework/API tests (`"S1"`, `7`, `None`, HDA) could be trimmed. That is low value, so leaving them is fine.
