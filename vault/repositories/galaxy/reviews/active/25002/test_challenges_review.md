# Test challenges review — PR #25002

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `8dd9549cab94b9b3568b098fcc02255faecfcead`
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

**Verdict:** the tests are strong and sit at the right layers. Framework tests carry the behavior, API tests cover what needs API introspection, the vitest tests check model logic without mocks, and there is a Selenium E2E test for the editor flow. Nothing should be dropped or rewritten. There are three small coverage gaps, all P3. Tests were not run because the worktree is not bootstrapped.

### P3 1 — `validInputTerminals()` change is untested

`BaseOutputTerminal.validInputTerminals()` (`client/src/components/Workflow/Editor/modules/terminals.ts`) now iterates `getCombinedStepInputs` instead of `step.inputs`, so gate and rename-reference ports are offered. Its only caller is `ConnectionMenu.vue`, the keyboard connection menu. The Selenium test connects by dragging, so this path is never exercised.

Fix: add a vitest beside the existing `"can accept new connection"` case in `terminals.test.ts`. Add a step whose rename references `$(inputs.sample_name)` and assert that a text parameter output's `validInputTerminals()` includes `sample_name`. The test fails without the change.

### P3 2 — No test covers a connected tool parameter in a rename

In `_referenced_step_input_values`, a non-data tool input goes through `replacement_for_input` and then `replace_expression_json_dataset`. `rename_from_tool_parameter.gxwf.yml` only covers a value set in `state`. When the parameter is connected to a computed value, such as `param_value_from_file/integer_param`, the expression.json unwrap is what produces the value instead of a dataset name. That branch is uncovered.

Fix: add a framework test (or a second workflow) in which `head`'s `lineNum` is connected from `param_value_from_file` and the rename is `first_$(inputs.lineNum)`. Assert the resulting name.

### P3 3 — Boolean formatting is checked only by the unit test

The PR description promises booleans render as `true`/`false`, not Python's `True`/`False`. Only `test_format_step_input_reference` checks this. Connecting a boolean parameter to a rename reference in `rename_from_step_input_values.gxwf.yml` would pin this user-facing behavior end to end. Optional: once that is covered, the unit cases already covered at higher layers (`"S1"`, `7`, `None`, HDA) could be trimmed. That trim is low value.
