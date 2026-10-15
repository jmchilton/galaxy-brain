# Invocation request export can't be posted back when a subworkflow step had runtime parameters

Posting the output of `GET /api/invocations/{id}/request` back to the invoke API raises an unhandled `ValueError` (a 500) when the original run set a parameter inside a subworkflow.

The export and the invoke API disagree on the shape of a subworkflow step's parameters. Here the original run set `num_lines` on the tool at index 1 inside the subworkflow at index 1:

| | `parameters` |
| --- | --- |
| Accepted by `POST /api/workflows/{id}/invocations` with `parameters_normalized: true` (the shape the run form submits) | `{"1": {"1\|num_lines": 2}}` |
| Returned by `GET /api/invocations/{id}/request` for that run | `{"1": {"<inner step id>": {"num_lines": 2}}}` |
| Posting the export back | `key.split("\|", 1)` on `"<inner step id>"` raises an unhandled `ValueError` → 500 |

`<inner step id>` is the database id of the tool step inside the subworkflow. The outer `"1"` is the subworkflow step's order index in both shapes. Top-level tool steps are not affected, because their parameters are exported keyed by order index and post back fine.

The export is described as "a description modeling an API request to invoke this workflow", and it always sets `parameters_normalized: true`, so posting it back is what it's for. The test helper `workflow_populator.rerun()` does exactly that. On dev, the **Rerun** button in the UI doesn't hit this 500, because the rerun page never forwards the exported `parameters` (it uses only the inputs and the job cache flag). Those values are dropped silently instead, which is a separate issue. Carrying step parameters into the UI rerun needs the same translation between stored inner step ids and `"<index>|name"` keys, so the helpers proposed below would serve both.

<details><summary>Reproduction (API)</summary>

Uses the `WORKFLOW_NESTED_RUNTIME_PARAMETER` test fixture (an outer workflow whose subworkflow runs `random_lines1` with `num_lines` as a runtime input), the same setup as `test_run_subworkflow_runtime_parameters`.

```text
POST /api/workflows/{workflow_id}/invocations
  parameters: {"1": {"1|num_lines": 2}}, parameters_normalized: true      → ok, 2 lines
GET  /api/invocations/{invocation_id}/request
  parameters: {"1": {"<inner step id>": {"num_lines": 2}}}                 ← nested by step id
POST /api/workflows/{workflow_id}/invocations   (body = the export)
  → ValueError → 500
```

An API test that asserts the export equals `{"1": {"1|num_lines": 2}}` ([`test_workflow_request_subworkflow_step_parameters_rerun`](https://github.com/jmchilton/galaxy/blob/1ad053b1fb3d297f5a0819943b8e1a80cf6c864a/lib/galaxy_test/api/test_workflows.py#L5686-L5701) on the branch below) fails on dev with the nested-by-id shape above, so it stops before posting back.

The post-back failure below comes from calling dev's `_normalize_step_parameters` directly, not from a running server. It uses stand-in step objects (outer subworkflow step id 101 at index 1, inner tool step id 4321 at index 1), first normalizing the run-form shape and then posting back the export built from it.

```text
normalized/stored:   {"101": {"4321": {"num_lines": 2}}}
exported parameters: {"1": {"4321": {"num_lines": 2}}}
Traceback (most recent call last):
  File "lib/galaxy/workflow/run_request.py", line 188, in _normalize_step_parameters
    step_index, param_name = key.split("|", 1)
ValueError: not enough values to unpack (expected 2, got 1)
```

</details>

<details><summary>Call path (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

Where the nested shape comes from:

```text
invoke (first run)
  _normalize_step_parameters(already_normalized=True)        run_request.py
    subworkflow step: split "1|num_lines" → {"1": {"num_lines": 2}}
      recurse into subworkflow → keyed by inner step.id      ← database id
  workflow_run_config_to_request
    store {inner_step_id: {"num_lines": 2}} as JSON under the outer step's id

GET /api/invocations/{id}/request
  serialize_workflow_invocation_to_request                   services/invocations.py
    re-key the outer step id → order index
    copy the stored JSON as-is                               # TODO: test subworkflows and ensure this works
```

Where posting it back fails:

```text
POST /api/workflows/{workflow_id}/invocations
  build_workflow_run_configs                                 run_request.py
    _normalize_step_parameters(already_normalized=True)
      subworkflow step: for key in {"<inner step id>": {...}}
        step_index, param_name = key.split("|", 1)
        → ValueError: not enough values to unpack (expected 2, got 1)
```

- Links: [`_normalize_step_parameters`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/workflow/run_request.py#L167-L203), [step parameter persistence](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/workflow/run_request.py#L635-L640), [`serialize_workflow_invocation_to_request`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/webapps/galaxy/services/invocations.py#L370-L377).
- The `"<index>|name"` form is the one the server builds the run form from: [`SubWorkflowModule.get_runtime_inputs`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/workflow/modules.py#L1024) names subworkflow runtime inputs `f"{step.order_index}|{prefixed_name}"`, and [`test_run_subworkflow_runtime_parameters`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy_test/api/test_workflows.py#L4785) invokes with it.
- Nothing between the route and `_normalize_step_parameters` catches it, and the app registers [exception handlers](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/webapps/base/api.py#L333-L345) only for `MessageException` and request validation errors, so the `ValueError` becomes a 500. The request body passes validation, since `parameters` is typed `dict[str, dict[str, Any]]`.
- Existing tests round-trip only top-level step parameters ([`test_run_replace_params_over_default`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy_test/api/test_workflows.py#L10396) exports and reruns `num_lines` on a top-level tool step). None uses a subworkflow.
- Small tidy-up in the same block: `int(parameter.name)` is wrapped in `except TypeError`, which misses the `ValueError` a non-numeric name would raise. Galaxy always writes `str(step.id)` there, so this is not reachable today.

</details>

## Context

Bug discovered while working on 🌿 [`workflow_rerun_step_parameters`](https://github.com/jmchilton/galaxy/tree/workflow_rerun_step_parameters), a spike that carries run-time step parameters through workflow rerun. A follow-up to 🔀 #18985, which added the request export along with the subworkflow TODO. Related to 🎯 #18981, which asked for workflow tests to rerun from the recovered request; that check would have caught this. Related to 🔀 #20032, whose rerun page loads this export. Companion issues cover the rerun simple form dropping step parameters, prefilling the full run form from an invocation, and the same export failing for imported invocations; that last one can share the re-keying helpers proposed here.

## Proposed Approach

Add an inverse pair of helpers on `WorkflowStep`: one that re-keys a subworkflow step's stored parameters from inner step ids to `"<inner order_index>|name"`, and one that turns that form back into the id-keyed map. Both recurse for nested subworkflows. The export uses the first. `_normalize_step_parameters` replaces its inline split loop with the second, and turns malformed or unknown inner keys into a 400 `RequestParameterInvalidException` instead of a 500.

<details><summary>Approach details</summary>

- **Helpers.** `WorkflowStep.step_parameters_by_index(param_dict)` and `WorkflowStep.step_parameters_by_id(param_dict)`. Both are a no-op for non-subworkflow steps. The id-to-index helper looks inner steps up with `steps_by_id`; the reverse uses `Workflow.step_by_index`, which already raises `KeyError` for a missing index.
- **Export.** `serialize_workflow_invocation_to_request` emits `step.step_parameters_by_index(json.loads(parameter.value))`, which drops the TODO. Catch `(TypeError, ValueError)` around `int(parameter.name)`.
- **Behaviour change.** On dev, an unknown or non-numeric inner index such as `"9|num_lines"` or `"x|num_lines"` is ignored without an error. With this change it is a 400. A key without `|` goes from 500 to 400.
- **No migration.** Nothing stored changes. Existing invocations export correctly, because the re-keying happens at read time.
- **Tests (API).**
  - Subworkflow round trip: run the nested fixture with `{"1": {"1|num_lines": 2}}`, assert the export equals it, rerun from the export, and assert that the rerun produced 2 lines and that its export matches too. On dev this fails at the first export assertion.
  - Top-level baseline: the same round trip for a top-level tool step with two parameters (one nested in a conditional). It already passes on dev.
- A working version is on the branch above (commit [`f4b9540`](https://github.com/jmchilton/galaxy/commit/f4b95406098), plus the 400 mapping in [`1ad053b`](https://github.com/jmchilton/galaxy/commit/1ad053b1fb3)).

</details>

## Alternative Approaches

We could instead teach the invoke API to accept the nested-by-id shape, change what gets stored to index-keyed form, or export from the per-step runtime state rows. We prefer re-keying at export time, because it keeps the public request shape in order indices (which survive workflow import and copying), it changes no stored data, and it fixes existing invocations too.

<details><summary>Alternatives In Detail</summary>

### Alternative: Accept the nested-by-id shape on invoke

<details><summary>Description</summary>

#### Details

In `_normalize_step_parameters`, detect subworkflow keys without `|` and treat them as inner step ids.

#### Why the proposed approach is preferred

Database step ids are not portable: they differ after workflow import or copy, and they point at the wrong step after invocation import. Accepting them makes the export work only on the same server and the same workflow instance. A bare numeric key is also ambiguous between an id and an index.

</details>

### Alternative: Store subworkflow parameters keyed by order index

<details><summary>Description</summary>

#### Details

Persist the `"<index>|name"` form in `WorkflowRequestInputParameter` instead of the normalized id-keyed map.

#### Why the proposed approach is preferred

Scheduling reads these rows back as id-keyed maps (`workflow_request_to_run_config` and the module injector), so that read path would need to change as well. Existing rows would still be nested by id, so the export needs read-time re-keying either way.

</details>

### Alternative: Export from `WorkflowRequestStepState`

<details><summary>Description</summary>

#### Details

Build the export's `parameters` from the per-step runtime state rows. Those rows have a foreign key to the step and are already remapped on invocation import.

#### Why the proposed approach is preferred

Those rows hold the full runtime state of every step, not only the values the user overrode, so the export would change from "what was overridden" to "everything". That is a bigger change in what the export means, and it deserves its own discussion.

</details>

</details>
