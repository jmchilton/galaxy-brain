# PR #25002 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `8dd9549cab94b9b3568b098fcc02255faecfcead` (merge-base `6864679ef0b0`)

## Verdict

Solid, well-tested feature. One real bug: `$(inputs.name)` naming an unconnected tool parameter whose value is falsy (`0`, `false`) renames to an empty string, contradicting the PR's own "booleans become true/false" formatting promise. Two small reuse/consistency nits. Playwright video commit looks fine.

## Findings

### P2 1 - Unconnected tool parameters with falsy values (`0`, `false`) rename to `""`

`_referenced_step_input_values` (`lib/galaxy/workflow/modules.py`) resolves tool inputs through `progress.replacement_for_input`. For an unconnected parameter that reads step state with a truthiness walrus (`lib/galaxy/workflow/run.py`, `replacement_for_input`):

```python
elif (
    step.state
    and (state_input := get_path(step.state.inputs, nested_key_to_path(prefixed_name), None))
    and not is_runtime_value(state_input)
):
    replacement = state_input
```

A boolean parameter set to `False` or an integer set to `0` is falsy, so it falls through to `NO_REPLACEMENT`, which `format_step_input_reference` turns into `""`. In tool execution that quirk is harmless (`NO_REPLACEMENT` just leaves the state value in place), but this PR is the first consumer that uses the return value as the value. So `rename: "flag_$(inputs.some_bool)"` with the bool off gives `flag_`, not `flag_false`; `head` with `lineNum: 0` gives `first_`.

Sibling path: the `when` expression code the PR doc cites ("as a when expression does") does not go through `replacement_for_input` for tool params. It skips names already in `execution_state.inputs` and reads them from the execution state. The rename path diverges from that.

Fix: for tool parameters, read unconnected values from `step.state.inputs` / the tool state with an `is not None` check, or change the walrus in `replacement_for_input` to `is not None` (the replacement equals the state value, so tool execution is unchanged). Add a framework-test case next to `rename_from_tool_parameter` with a tool boolean set to false (or an integer 0) to make it red-to-green.

### P3 1 - Non-tool reference resolution reimplements `replacement_for_input` (optional)

The non-tool branch of `_referenced_step_input_values` (connection -> `replacement_for_connection`, else `step_input.default_value`) repeats the connection/default branches of `replacement_for_input`, and the `when` `extra_step_state` loop (which this PR also patches with a new `elif step_input.connections` / default fallback) is a third copy. Passing a synthesized `InputDescription(name=..., input_type="parameter", multiple=False, optional=True)` to `progress.replacement_for_input` would collapse the branch to one call and keep extra-step-input resolution in one place. The `when` loop could use the same helper, so future fixes land once.

### P3 2 - Client and backend disagree on what counts as a tool parameter (optional)

The client suppresses the rename port when `name` is any top-level key of `step.tool_state` (`findStepExtraInputs` in `client/src/stores/workflowStepStore.ts`). The backend treats a name as a tool input only when it is in `all_inputs_by_name`, which holds the prefixed names of visible leaf inputs from `get_all_inputs`. For a conditional, section or repeat container (e.g. `$(inputs.cond)`), or a hidden-attribute parameter, the editor shows no port, and the backend finds no tool input, no connection and no default, so it silently renames to `""`. Unknown names, such as typos in hand-written gxformat2, also silently become `""`. Consider suppressing the port only for scalar `tool_state` values. A lint or validation warning for references that match neither a tool leaf input nor a step input would reject never-working input instead of quietly producing empty names.

## Notes (not findings)

- Single-pass `#{}`/`$(inputs.)` substitution and the transient PJA copy are sound. `RenameDatasetAction` is immediate, so the copy is never associated with a job, matching the existing `runtime_post_job_actions` `__to_pja(..., None)` pattern. The API test asserts the stored action is unchanged.
- The `map_over.py` guard for inputs that have only a default is a reasonable fix.
- Tests cover the feature well at the right layers (framework workflows, API, Selenium). The `format_step_input_reference` parametrized unit test is borderline trivial but cheap.
- Playwright `close()` now closes the context before the browser, wrapped in try/finally. The non-Playwright guard on `video_dir`/`slow_mo` is good.
- No security concerns.
