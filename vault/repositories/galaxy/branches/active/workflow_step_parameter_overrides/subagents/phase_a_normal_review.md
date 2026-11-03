Run via Claude Opus at high effort.

# Phase A: normal review

Reviewed `46db8f9d5b6..HEAD` against [api_design.md](../api_design.md), with [REVIEW_FOCUS.md](../../../../../../agents/_shared/REVIEW_FOCUS.md). Phase A matches the contract. Merging, every 400 case, applying on top of `parameters`, subworkflow nesting, `/request` recording and export/import all behave as written. I found no correctness bugs.

I acted on four small findings:

- A misplaced JSDoc.
- An unneeded `getattr`.
- Documenting the conditional-case deviation in the field's schema description.
- Two test gaps around the `/request` split.

Each change is squashed into the commit it belongs to. Nothing is pushed. No security-sensitive findings.

| New SHA | Commit | Change |
|---|---|---|
| `294ca54a441` | Add step_parameter_overrides to workflow invocation requests | The schema description now says that a case switch fills the new case's defaults and records them (`schema.ts` regenerated). The two-level test asserts `parameters is None`. A new mixed `parameters` + overrides test runs inside a subworkflow (the same key in both fields, then the parent and child `/request`). |
| `7bc9772a835` | Give overridable job parameter display rows their nested tool state path | `getattr(input, "is_dynamic", False)` becomes `input.is_dynamic`, which `ToolParameter` always defines. |
| `39778027ff4` | List subworkflows' tool steps and their inputs in the workflow run form data | (rebased only) |
| `0657a0ee639` | Choose tool step parameters to override in the simple workflow run form | (rebased only) |
| `798d6b27a2f` | Rerun a workflow with one of a step's job parameters changed | `isTopLevelInvocationJob` had been inserted between `fetchInvocationForJob`'s JSDoc and its function, so that doc described the wrong function. Moved it back. |
| `385a31a2a3a` | E2E: choose, rerun and link step parameter overrides in the simple run form | (rebased only) |

## Not acted on

- **Making the `/request` subtraction independent of #24178** (question 2): a recommendation for the extraction agent, below. I didn't restructure it on a stack where it works.
- **`_default` evaluates initial values with an empty context** (`get_initial_value(trans, {})`). For a switched-to case whose selects take dynamic options from other parameters, or that contains a `data_column`, the filled default may be wrong, or the request may 400 or 500. It is untested and an edge case of an API-only path (the picker locks test parameters). Worth a test before the client allows switching cases.
- **The `/request` split loses information when both fields set a key.** It is sound for reproducing the run, below. Kept, now pinned by a test.
- **"Rerun with this changed" on a run that set legacy `parameters`** lands in the expanded form, which ignores the link argument. The expanded-form alert explains why the simple form is off, but not that the clicked parameter wasn't preset. This is a UX gap for a later phase.
- **Connected parameters get a "rerun with this changed" action.** `parameters_display` sets `path` on any overridable parameter of the job, including one connected in the workflow (e.g. `echo_connected`'s `threshold`). The link then shows the "can't be set" dropped alert. Hiding the action would need the workflow step's connections in `JobParameters`. The current behavior is acceptable.
- **The "rerun with this changed" guard skips steps inside subworkflow invocations.** Mapping such a step to an outer `step_parameter_overrides` path is possible: walk up the invocation's parent steps. That is follow-up work.
- **Small vitest cases** (`diffKeys`, `displayValue`). Borderline trivial, but cheap and they pin client-only behavior that API tests can't reach. Left in.
- **`OVERRIDABLE_PARAMETER_TYPES` (server) and `EXPOSABLE_TYPES` (client) duplicate the same set.** It crosses a language boundary, and both sides say what they mean. Left as is.

<details>
<summary>Full review</summary>

## Contract conformance

Checked `lib/galaxy/workflow/step_parameter_overrides.py` and the API tests against each point of `api_design.md`:

- **Keys by `order_index`, nested tool state, subworkflows nested to any depth.** `_apply` recurses for subworkflow steps, and inner tool steps get the same walker. One and two levels deep are tested.
- **Merging.** Objects merge into saved state. Repeats merge by position (`_repeat` walks `instances[i]`, and empty objects set nothing). Overrides can't add instances. All tested.
- **400 cases.** Each is tested, with `err_data` keyed by slash path:
  - an unknown step;
  - a non-tool step;
  - an unknown parameter;
  - a parameter in an inactive case, from overrides, `parameters` or saved state;
  - a test value matching no case;
  - extra repeat instances;
  - wrong container shapes;
  - data parameters;
  - connected parameters;
  - both batch spellings;
  - `__` keys.

  A name in no case falls through to "unknown parameter", which is right.
- **On top of `parameters`.** `_apply` merges `{**existing, **flat}` into the map `_normalize_step_parameters` built, and the walker reads `pending` (the `parameters` values) for case selection and default filling. Tested at the top level, and now inside a subworkflow.
- **Translation into the internal map.** `populate_module_and_state`, scheduling and subworkflow invocation are untouched, as the design says.
- **Recording.** A `meta` row holds the overrides. Subworkflow invocations record their slice (`.get(str(step.order_index))`). The row survives export and import with no migration.

## Question 1: storage (meta row plus step rows, stripped in `/request`)

The design is sound. The `step` rows have to hold the merged values: `workflow_request_to_run_config` rebuilds `param_map` from them, and #24176's `recover_step_parameters` seeds the expanded-form rerun from them. The meta row is what keeps the overrides distinguishable.

Mixed requests are where it could go wrong. I traced each case:

- **The same key in both fields, with different values.** The step row holds the override value. `_without_step_parameter_overrides` drops the key from `parameters` because its value equals the override, so `/request` reports it only under `step_parameter_overrides`. The value `parameters` sent is lost from the record. But the job never saw it, and resubmitting the exported request reproduces the run exactly. That makes this a lossy but faithful record of what ran, not a misreport. It is now pinned for the top level (existing test, `threshold`) and inside a subworkflow (new test, including the child invocation's `/request`).
- **`parameters` switches a case, overrides set the new case's values.** `pending` drives the case and no defaults are filled. `/request` reports the test parameter under `parameters` and the values under overrides. Resubmitting is equivalent.
- **Overrides switch a case and `parameters` set some new-case values.** `_fill_defaults` skips names in `pending`, so `parameters`' values win and only the others are filled. When the test value is the same in both, `/request` drops it from `parameters` and keeps the `parameters`-only values there. Resubmitting is equivalent, because the fill again skips the pending names.
- **The same key with the same value.** It is reported once, under overrides. Equivalent.

The `step_overrides[name] != value` clause in `_without_step_parameter_overrides` can't trigger for a freshly invoked request, since overrides are merged last. It is defensive: if a row ever differed, reporting it in `parameters` is the honest fallback. Fine to keep.

The alternative is recording only the `parameters` map in step rows and re-applying the meta row at recovery. That would make `/request` exact, with no subtraction. But it would move override application into `workflow_request_to_run_config` and `recover_step_parameters`, and widen the change into scheduling. That isn't worth it for a record that already reproduces the run.

## Question 2: independence from the #24178 stack

The invoke side is already independent. Before #24178, `_normalize_step_parameters` already nested subworkflow parameters by inner step id, and `_apply` reads and writes that shape.

Two things tie commit 1 to #24178:

1. **`/request` subtraction.** On `dev` the `STEP_PARAMETERS` branch reports `json.loads(row.value)` keyed by outer `order_index`, so subworkflow rows stay nested by inner step id. Commit 1 subtracts `"<inner index>|name"` keys, which only matches #24178's `resolve_step_parameters`.
2. **The child invocation's step rows.** `dev` passes `param_map.get(step.order_index)` to subworkflow run configs, so child invocations get no step rows. The child meta row is still recorded (its slice is keyed by order index), and the inner steps still run with the overrides.

Cleanest path:

- **Subtract in the stored format, before re-keying.** Have the flattener emit `{step_id: flat}`, nested by inner step id for subworkflows, which is exactly what `apply_step_parameter_overrides` writes. Then drop matching names from `json.loads(row.value)` per row, before the row is formatted. This works with `dev`'s raw format and with #24178's `resolve_step_parameters`.

  It needs the meta row read before the step rows: two passes, or collect the rows first. `flatten_step_parameter_overrides` would key by `step.id` instead of `order_index`. `flatten_tool_state` doesn't change.
- **Carry the one-line `param_map.get(step.id)` fix in the extracted commit.** It is a standalone bug fix, and without it the new subworkflow `/request` assertions read empty child rows. Alternatively, land it first on its own.
- **Commits 2 and 3 already apply to `dev`.** The client commits still need #24177's `simpleFormDisabledReason`, `withRerunValues` and the rerun prefill.

The new `test_overrides_apply_inside_subworkflow_on_top_of_parameters` asserts the nested `"1|mode"` key in `/request`. An extraction that breaks the format dependency shows up there first.

## Question 3: the conditional-case deviation

Filling defaults is the right call. The alternatives are worse:

- Passing `allow_tool_state_corrections` silently corrects anything, not just the new case.
- A 400 that makes callers spell out every new-case parameter contradicts "everything else keeps the workflow's saved values".
- Filling without recording would make the recorded overrides flatten to something other than what ran, which breaks the exact `/request` subtraction above.

Recording the filled values keeps the record equal to what the job got. The tool version is pinned by the step, so the defaults are stable anyway.

Costs:

- `/request` returns more than was sent, which is now stated in the schema description.
- A case-switched rerun goes to the expanded form via `rerunHasUnshownStepParameterOverrides`, because the tree locks test parameters.

The legacy `parameters` path still 400s ("upgrade messages") when it switches a case without supplying the new case's values. That divergence is acceptable, since `parameters` is legacy, but worth one line in the PR description.

Gaps in `_fill_defaults` (deferred, above):

- `_default` uses an empty `other_values` context.
- Nested conditional test parameters inside a filled case don't consult `pending`.
- Repeats with `min > 0` in a switched-to case are untested.

`_fill_defaults` mirrors what `Conditional.get_initial_value` / `Section.get_initial_value` do in `grouping.py`. Those return Python-valued state with `__current_case__`, not basic flat values, so reusing them would need a `params_to_strings`-style conversion. The small custom walker is justified.

## Code quality and reuse

- **Overrides module.** It is well bounded. Its docstrings describe the shapes. Imports are at top level, and `StepParameterOverrides` is typed at the edges.
  - `_conditional`'s final fallback (`_case_for(saved.get(test_name))` when `__current_case__` is missing) is close to dead code. `value_from_basic` recomputes `__current_case__` when the module state loads. It is harmless.
  - `_tool_step_overrides` builds a module with `module_factory.from_workflow_step` that `populate_module_and_state` builds again later. That costs one extra module per overridden step, which is acceptable.
- **`flatten_tool_state` and the walker both encode the flat-name rules** (`a|b`, `name_i|`). The tool-free flattener is needed at `/request` time, and for validated overrides the two agree, which the doctest and API tests pin.
- **`_tool_step_run_model` extraction** in `managers/workflows.py` is a clean refactor that `_subworkflow_run_steps` reuses. Inner steps run the full `tool.to_json` and keep only `inputs`. That is heavy for large subworkflows, but bounded.
- **Client.**
  - `stepParameterTree.ts` reuses `buildNestedState` and `matchCase` from `Form/utilities`.
  - `WorkflowRunStepParameters.vue` is self-contained, and `WorkflowRunFormSimple` only threads props and the payload field.
  - `navigation.yml` targets replace raw selectors.
  - `steps: any[]` and `input?: any` follow the untyped run model (`model.js`), so narrowing them now would be cosmetic.
- **Fixed:** the misplaced JSDoc in `api/invocations.ts`, and `getattr(..., "is_dynamic", False)` on a `ToolParameter`.

## Test quality

- No existing tests were changed or weakened. `test_workflows.py` is untouched by the branch.
- The API tests exercise real jobs through an echo tool, which is the right level for this behavior.
- Gaps I filled:
  - the two-level test now asserts `parameters is None`;
  - a mixed subworkflow test covers both `/request`s.
- Gaps left:
  - `/request` of an imported invocation, blocked on #24175 and documented in the test;
  - a switched-to case with a `min > 0` repeat or a `data_column`.
- Client unit tests target client-only logic (tree building, nesting, typing, route parsing, the gating reason). The two smallest (`diffKeys`, `displayValue`) are borderline, but cheap.

## Client UX

- **Cards.** They show the breadcrumb, a "saved" or "original run" hint and a remove action, and they type their values. Dropped link or rerun keys get a dismissible alert that lists the reasons.
- **Server errors.** `err_data` paths aren't mapped onto cards (a known gap). With slash keys on both sides, that mapping is a small follow-up.
- **"Rerun with this changed".** It is guarded to top-level, single-job steps, at the cost of one extra `/api/invocations?job_id` call per expanded step. On connected parameters and on legacy-`parameters` runs it degrades to an alert or to the expanded form (above).

## Tests run after the fixes

- API (`test_workflow_step_parameter_overrides.py`, plus `test_jobs.py -k parameters_display`): **13 passed**. That is 12 tests in the new file (the 11 existing ones plus the new mixed subworkflow test) and 1 in `test_jobs.py`.
- Vitest (node 22.20.0) on `Workflow/Run/`, `JobParameters`, `WorkflowInvocationState` and `JobInformation`: **31 files, 175 tests pass**.
- ruff and black are clean on the touched Python. Prettier is clean on `invocations.ts`. Regenerating `schema.ts` changed only the two description lines.
- E2E was not rerun. No E2E-relevant UI changed: the client change only moves a doc comment.

</details>
