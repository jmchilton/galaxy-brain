Toward 🎯 #23521 - refuse a conditional case that resolves to nothing instead of silently running the last `<when>`.

When a conditional's test parameter matches no `<when>`, `visit_input_values` records `__current_case__ = -1` in the tool state and moves on. Six readers then do `input.cases[values["__current_case__"]]`, and in Python `cases[-1]` is the *last* case. Values shaped for one case get wrapped with another case's parameters, and the failure surfaces far away. A `multiple="true"` list handed to a single-dataset parameter of the same name raises `TypeError: Expected [] to be hashable` from `ElementIdentifierMapper`. That is the crash in #23521 and the production traceback #19538, both failing in `wrap_values` → `cases[current]`.

One way to get there: invoke with `allow_tool_state_corrections: true`, as planemo always does, a workflow whose step has its test parameter connected to an upstream text output. The correction lets the request through, then at scheduling the upstream value (`Pooling`) replaces the test parameter, matches no `<when>`, and the step runs the last case. On `release_26.0` the step fails with `'RuntimeValue' object has no attribute 'find_conversion_destination'`, because the last case's `reads` was never connected.

The messages users get on the way are also unhelpful. Every unresolved case reads "The selected case is unavailable/invalid.", without naming the value or the options.

This PR gives the case lookup one accessor, `Conditional.get_current_case_inputs`, and routes all six readers through it:

- **Execution** (`wrapped.py`, `evaluation.py`, `wrapped_json.py`) raises `RequestParameterInvalidException` instead of running a job against a case its state wasn't shaped for.
- **Form building and state scrubbing** (`params_to_incoming`, `workflow/extract.py`, the workflow preview) log a warning and skip the case's inputs. Stored state from an older tool version is where an unresolved case is most likely (as in #23551), so these paths keep the form that is needed to fix it.

It also names the value and the options wherever an unresolved case is reported:

<details><summary>Messages, before and after</summary>

Stale stored state (pinned by `test_refactor_tool_state_upgrade`):

```
before: The selected case is unavailable/invalid. Using default: 'b'.
after:  No case matching 'bool_to_select' value False. Valid values are ['a', 'b']. Using default: 'b'.
```

A test parameter connected to another step (pinned by `test_run_workflow_connected_conditional_test_param`):

```
before: The selected case is unavailable/invalid. Using default: 'no'.
after:  'batch_select' selects a case of 'batch_cond' and cannot be connected or set at runtime. Valid values are ['no', 'yes']. Using default: 'no'.
```

At execution, the scheduling case above (pinned by `test_run_workflow_corrected_state_unresolvable_conditional_case`):

```
before: Failed to create 1 job(s) for workflow step 4: Error executing tool with id 'conditional_data_arity': 'RuntimeValue' object has no attribute 'find_conversion_destination'
after:  Conditional parameter 'batch_cond': No case matching 'batch_select' value 'Pooling'. Valid values are ['no', 'yes'].
```

</details>

<details><summary>Narrowed exception handling</summary>

`populate_state`, `_populate_state_legacy`, `populate_state_async` and `fill_dynamic_defaults` each wrapped both `get_current_case()` *and* the recursive walk over the case's inputs in `except Exception:`. So any bug inside the case was reported as "The selected case is unavailable/invalid." and its cause was discarded. Now only `get_current_case()` is guarded, with `except ValueError:` (the only exception it raises for an unmatched value), and `fill_dynamic_defaults` chains the cause.

</details>

### Why "toward" rather than "fixes" #23521

The route above is one way to reach the crash; whether it is the one in #23521 is not established. Without `allow_tool_state_corrections`, request-time validation refuses every other route tried: a connected test parameter, at the top level or in a subworkflow (where the flag is never passed down). The editor doesn't let you connect a test parameter. Confirming the #23521 route needs the step details of its usegalaxy.eu invocation. Whatever the route, this PR turns the crash into a named error.

## Context

Related to 🎯 #23521 and #19538, which crash in the same `cases[current]` wrapping. #22401 passed through the same frame but was closed by 🔀 #22406 (HDCA submitted to a single data parameter), a different cause. Builds on 🔀 #23649, which made `populate_state` serialize the fallback state of an unresolved conditional. Adjacent to 🎯 #23424 (validate `when` expression references at import).

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The parameter, the offending value and the valid values (see "Messages, before and after").
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A - no unit tests; the API tests and framework tool go through real workflows and tools.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Only steps whose test parameter resolves to no case at scheduling. They ran with the last case's parameters (crashing when the shapes differ) and now fail without creating a job, naming the value. Request-time refusals get a clearer message. An exception raised inside a case's own parameters now propagates with its own type instead of becoming a 400 on the test parameter.
- [x] Who hits this in practice and what is the evidence? #23521 and the Sentry traceback #19538, both in `wrap_values` → `cases[current]`; planemo users reach it by the route above. Stale stored conditional values are real (#23551).
- [x] Were simpler or existing approaches considered? Yes - see details.

<details><summary>Alternatives considered</summary>

- **Stop storing `-1` in state.** `visit_input_values` also drives tool-form building, and with every reader now refusing or skipping it the stored sentinel is inert.
- **Make the `case_error` fatal in the workflow execute callback.** Unnecessary: an execution reader now raises, and the invocation message records the failing step.
- **Unit tests over a hand-built `Conditional`.** Dropped in favour of the API test and the framework tool, which go through the real machinery.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
  - `test_workflows.py::test_run_workflow_corrected_state_unresolvable_conditional_case`: the scheduling route above. Red on `release_26.0` (the `find_conversion_destination` error); now the invocation fails naming `'Pooling'` and the valid values, and the step creates no job.
  - `test_workflows.py::test_run_workflow_connected_conditional_test_param`: a test parameter connected inside a subworkflow is refused at request time, naming the parameter and the valid values.
  - `test_refactor_tool_state_upgrade` and `test_refactor_subworkflow_tool_state_upgrade` pin the new stale-state message.
  - `test/functional/tools/conditional_data_arity.xml`: the dada2-like shape (same parameter name, different arity per `<when>`, single-dataset case last) still runs both cases.

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
