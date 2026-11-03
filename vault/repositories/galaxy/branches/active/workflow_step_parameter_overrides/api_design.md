# API design (posted to #24454, issuecomment-6592278488)

We got valid pushback on the step parameter syntax above (`"3": {"1|cond|threshold": 0.05}`). It works in `dev` today: it's what the legacy expanded form sends with `parameters_normalized`. But it squashes tool state and subworkflow nesting into `|`-joined strings, and `parameters` is documented as legacy (its schema title is "Legacy Step Parameters", and the `/request` export says a request that sets it "was not executed in a best-practice fashion"). A new feature shouldn't be built on it.

### Proposal: a dedicated, nested field

```json
POST /api/workflows/{workflow_id}/invocations
{
  "inputs": {...},
  "inputs_by": "step_index",
  "step_parameter_overrides": {
    "2": {"queries": [{"column": "c3"}]},
    "3": {
      "1": {"cond": {"threshold": 0.05}},
      "4": {"0": {"min_quality": 20}}
    }
  }
}
```

- Keys are step `order_index`, as with `inputs_by: "step_index"`.
- A tool step takes nested tool state. A subworkflow step takes the inner workflow's overrides, in the same shape, nested as deep as the workflow goes.
- It carries only the parameters the user exposed. Everything else keeps the workflow's saved values.

### Why it fits the existing API

- **Nested tool state is already Galaxy's modern shape.** The tool API's `input_format: "21.01"` and gxformat2 `state` both use objects for sections and conditionals and lists for repeats.
- **Subworkflows nest as in gxformat2's `run:`.** The server already holds step parameters this way internally, keyed by step and nested per subworkflow. The `|` exists only on the wire.
- **The payload already has a field per concern:** `inputs`, `replacement_params`, `resource_params`. `parameters` stays as it is for the expanded form and existing API clients.

### What this changes above

- **Exposure keys and `exposed_step_parameters` go away.** The recorded overrides *are* the exposed set. Rerun re-shows them, and invocations with only `parameters` keep the #24177 expanded-form fallback.
- **G1 (strict keys) applies to the new field from day one.** No existing caller breaks and no audit is needed. Strict `parameters` becomes an optional follow-up.
- **G4 becomes "record `step_parameter_overrides` with the request".** `/request` returns it and import/export carries it. It uses step indexes, so import needs no re-keying.

<details>
<summary>Semantics</summary>

- Objects merge into the step's saved state. Repeat lists merge by position: `[{}, {"column": "c3"}]` changes only the second instance.
- 400 for an unknown step or parameter, a parameter in an inactive conditional case, or a repeat index that doesn't exist. Overrides never add repeat instances.
- To switch a conditional's case, include its test parameter.
- Tool parameters only. Data and collection values stay in `inputs`, and batch values and post-job actions are rejected.
- If both fields are sent, overrides apply on top of `parameters`.
- On the server, the field translates into the same internal parameter map `parameters` produces, so scheduling and subworkflow invocation don't change.

</details>

<details>
<summary>Links, and "rerun this step"</summary>

- Run links carry the same object in one route argument, as URL-encoded JSON. A `null` value shows the parameter with the workflow's value and no preset.
- dannon, your step rerun maps onto this directly: resubmit the exported request with a one-entry `step_parameter_overrides` for the edited step. Because overrides apply on top of `parameters`, that works for expanded-form runs too. Your `rerun_of_invocation_id` / `rerun_step_index` meta rows sit alongside unchanged, and the job-cache preference stays independent.

</details>

