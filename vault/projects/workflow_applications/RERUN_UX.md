# Rerun UX: exposing step parameters in the simple run form

Spec for "bonus" step parameters in the simple workflow run form. Code paths are cited against the `issue_24177_rerun_step_params_full_form` worktree (`/Users/jxc755/projects/worktrees/galaxy/branch/issue_24177_rerun_step_params_full_form`), the top of the #24178 → #24176 → #24177 stack on `dev`. #24175 is a sibling on #24178.

## Problem

Galaxy has two run forms:

- **Expanded form** (`client/src/components/Workflow/Run/WorkflowRunForm.vue`) renders every step and every unconnected tool param. It submits all of them as `parameters` with `parameters_normalized: true`.
- **Simple form** (`WorkflowRunFormSimple.vue`) renders only workflow inputs and workflow (`${}`) parameters. It never submits `parameters`.

Users who want to change one tool setting at run time have to use the expanded form, which is noisy. It also pins every rerun of that invocation to the expanded form: the full form records every unconnected param, so the request export is non-empty and `rerunHasStepParameters` fires. The goal is to let the simple form carry a small, explicit set of step parameter overrides.

## Current state (after the stack)

| Concern | Where | Notes |
|---|---|---|
| Run route | `client/src/entry/analysis/router.js` `workflows/run` | Takes query args `id`, `version` and `instance`. There is no way to pass step params. |
| Rerun route | same file, `workflows/rerun?invocation_id=` → `WorkflowRerun.vue` | Loads `GET /api/invocations/{id}/request`, then mounts `WorkflowRun` with `rerun-request`, `rerun-invocation-id` and `prefer-simple-form`. |
| Rerun entrypoints | `Workflow/WorkflowNavigationTitle.vue`, `Grid/configs/invocations.ts` | Both push `/workflows/rerun?invocation_id=…`. |
| Form choice | `Workflow/Run/simpleFormDisabledReason.ts` | Reasons: `hasWorkflowResourceParameters`, `hasDisconnectedInputs`, `hasReplacementParameters`, `rerunHasStepParameters` (#24176/#24177). |
| Run model | `Workflow/Run/model.js` `WorkflowRunModel` | Built from `GET /api/workflows/{id}/download?style=run[&invocation_id=]` (`services.js#getRunData`). `steps[i].inputs` is the tool form JSON (`tool.to_json`) and `step_index` is the `order_index`. Also provides `rerunInputValue`, `withRerunValues` and `rerunHasStepParameters`. |
| Server run dict | `lib/galaxy/managers/workflows.py` `_workflow_to_dict_run` | Tool steps: the full tool form for `step.state`, server-seeded from the invocation when `invocation_id` is set (#24176, `_compute_seeded_runtime_state`). Subworkflow steps: only the inner **RuntimeValue** params, keyed `<inner order_index>|<prefixed>` (`SubWorkflowModule.get_runtime_inputs`, `lib/galaxy/workflow/modules.py`). |
| Simple submit | `WorkflowRunFormSimple.vue#onExecute` | `{inputs, inputs_by: "step_index", replacement_params, batch, use_cached_job, version, history_id \| new_history_name, preferred_*_object_store_id, on_complete, landing_uuid}`. `replacement_params` instead of `replacement_dict` is #24177. |
| Expanded submit | `WorkflowRunForm.vue` (~L332) | `parameters: {<order_index>: {"<prefixed|name>": value}}`, `parameters_normalized: true`, plus `inputs`, `replacement_params` and `resource_params`. |
| Payload schema | `lib/galaxy/schema/workflows.py` `InvokeWorkflowPayload` | `parameters: dict[str, dict[str, Any]]`, `parameters_normalized`. `STEP_PARAMETERS_DESCRIPTION` documents the subworkflow key form (#24178 D). |
| Normalization | `lib/galaxy/workflow/run_request.py#_normalize_step_parameters` | With `already_normalized`, an outer key must be a known `order_index` (else 400, #24178 B). Subworkflow dicts go through `WorkflowStep.step_parameters_by_id` (`<i>\|<j>\|name` nests), and a bad key gives a 400. |
| Applying params | `ToolModule.compute_runtime_state` (`modules.py` ~L680) | Uses `visit_input_values` over the **current** state, so a key applies only if that path exists in it: the active conditional case and existing repeat instances. **Any other key is silently ignored.** |
| Export | `GET /api/invocations/{id}/request` | Uses `WorkflowRequestInputParameter.resolve_step_parameters` (`lib/galaxy/model/__init__.py`), which re-keys subworkflow rows to `<idx>\|name` (#24178). Import re-keys rows (#24175). |
| Client param tree | `components/Form/utilities.js#visitInputs` | Node shapes: `repeat` (`cache[]` instances, named `name_<j>`), `section` (`inputs`), `conditional` (`test_param`, `cases[].inputs`, active case via `matchCase`). Prefixed names are `a\|b_0\|c`, the same as server `prefixed_name`. |
| Invocation step params | `WorkflowInvocationState/WorkflowInvocationStep.vue` → `JobStep.vue` → `JobParameters/JobParameters.vue` | Data comes from `/api/jobs/{id}/parameters_display` (`managers/jobs.py#summarize_job_parameters`), which returns `{text (label), depth, value}`. **It has no prefixed name and no machine value.** |
| Landing | `CreateWorkflowLandingRequestPayload.request_state` | The simple form uses this only for `inputs`. |

## User flows

### F1: Run with added params

1. In the simple form, the user clicks **Add step parameter** (below the workflow inputs).
2. A picker opens. The user selects one or more params and clicks **Add**.
3. Each param renders as a bonus input card. The card title is `Step N: <step label/tool name> › <param label path>`. The value starts at the workflow's saved value.
4. The user edits the value or removes the card (×). Submitting sends `parameters` (see API).

### F2: Link with pre-exposed params

- `/workflows/run?id=…&step_param=3|cond|threshold&step_param=5|2|filter|min` opens the simple form with those cards already shown and saved values filled in.
- Unresolvable entries produce a dismissible warning listing them, and the run is not blocked.
- Optional later step: `&step_param_value=…` or a landing `request_state.parameters` for preset values (see Q3).

### F3: Rerun from the invocation view with one change

1. In the invocation view, the step's job parameter table gets a per-row **Rerun with this changed** action. It appears only on rows that map to an exposable param.
2. The action opens `/workflows/rerun?invocation_id=X&step_param=<idx>|<prefixed>`.
3. The simple form opens with the original inputs (existing rerun prefill), the card exposed and its value **prefilled from the original run**, not from the workflow default.
4. Mapped steps (several jobs) show the action once per step, at step level. The value comes from the invocation request, not from any one job.

### F4: Rerun prefill of previously added params

- When the export's `parameters` is a "small" set, rerun no longer forces the expanded form. The simple form exposes those keys as prefilled cards, which replaces the #24177 `rerunHasStepParameters` gate for this case.
- A set is small when every key resolves to an exposable param and the count is ≤ N (config, e.g. 10).
- Exports from expanded-form runs carry every unconnected param. They stay on the expanded form under the existing gate.
- Better still, diff the export against the saved state and expose only the params that changed (see Q1).

## Picker tree

The source is the already-loaded `WorkflowRunModel` (`steps[i].inputs`). On rerun that data is server-seeded, so the tree reflects the original run's conditional cases and repeat counts.

```
Workflow
├─ 1: Input dataset            (input steps: hidden, they're already in the form)
├─ 2: Cut (tool)
│   ├─ columns                 leaf
│   ├─ Section "advanced"
│   │   └─ delimiter           leaf
│   ├─ Repeat "queries"
│   │   ├─ #1 (queries_0)      → leaves
│   │   └─ #2 (queries_1)
│   └─ Conditional "mode"      (test param NOT selectable, shows its current value as a badge)
│       └─ [active case only]  → leaves
└─ 3: Subworkflow "QC"
    └─ only inner RuntimeValue params as listed by the run dict (`2|cond|x` ...)
```

Rules:

- **Selectable leaves.** Scalar tool params: text, integer, float, boolean, select (including dynamic), color, hidden-data-free selects.
- **Excluded:**
  - `data` and `data_collection` params.
  - Connected inputs (`model.isConnected(stepId, name)`).
  - **Conditional test params**, which would reshape the step.
  - Params already rendered by the simple form.
  - Leaves whose saved value is a `${…}` template. That value belongs to the workflow-parameter card already shown.
  - `hidden`, `upload_dataset`, and other params with `is_dynamic` data deps (`dynamic_options` that depend on data inputs). Show these disabled with a reason, not omitted, so users understand why.
- **Conditional children.** Only the active case for the loaded state is shown. Other cases are not listed, because `compute_runtime_state` silently ignores keys outside the active case (see the gap below). The decision is to allow active-case children and freeze the test value; changing the case needs the expanded form.
- **Repeats.** Only existing instances (`cache[j]` → `name_j`) are listed. Adding or removing instances is out of scope, since flat keys cannot create instances server-side.
- **Subworkflows.** First pass lists only what the run dict already exposes (inner RuntimeValue params). Listing all inner params needs a server change (see gap G3). The tree nests by inner step, `3 › QC › 2: Filter › cond › x`, and the key becomes `"3": {"2|cond|x": v}`. Nested subworkflows use `i|j|name`.
- **Search.** A filter box matches step label, tool name and param label or name. Steps with no selectable leaves are collapsed or greyed.
- **Keys.** The tree node id is the canonical **exposure key** `<order_index>|<prefixed_name>`, the same string as the URL `step_param` value and the export key. For subworkflows it is `<outer>|<inner>|<prefixed>`.

## Form rendering, add and remove

- Bonus cards render through the same `FormDisplay`/`FormElement` path the simple form already uses for workflow inputs. The input JSON is the leaf node from `steps[i].inputs`, deep-cloned, with `name` set to an internal key (e.g. `__step_param__/<exposure key>`) so it cannot collide with input step names.
- A section header such as "Step parameters (n)" lists the cards in workflow order. Each card has a remove button and a muted "default: …" hint (the saved value, or the original-run value on rerun) plus a reset link.
- State: `exposedKeys: string[]` in `WorkflowRunFormSimple`, seeded from the route prop, then the rerun export (F4), then user picks. The order is stable and duplicates are ignored.
- Submit: each bonus card becomes `parameters[outer][restKey] = value`, sent only when `exposedKeys` is non-empty, with `parameters_normalized: true`.
- Removing a card stops sending that key, so the workflow's saved value applies.
- Select values must be sent in the same form the expanded form sends today, so `check_param` accepts them.
- The `hasDisconnectedInputs` gate could later be lifted by auto-exposing the open RuntimeValue params as required bonus cards. This is a follow-up, not first pass.

## Validation and errors

| Case | Behaviour |
|---|---|
| Exposure key's outer step is missing or a different type (workflow edited since the run or link) | Drop the key and show a warning listing dropped keys. Never submit it. The server already 400s on unknown outer index (#24178). |
| Prefixed name not found in the step (param renamed, tool upgraded, inactive case, repeat index ≥ count) | Client: drop and warn. Server today: **silently ignored** (G1). |
| Key targets a conditional test param or excluded type | The client refuses to expose it, with a warning. |
| Invalid value (int out of range, bad select option) | Server `check_param` errors arrive in `step_errors` / `err_data`. Map them back to the card by key, the way `WorkflowRunForm` maps `err_data` to a step. |
| Subworkflow inner index unknown or malformed | 400 from #24178. The client should catch this first through the run dict. |
| Rerun export key not exposable (inactive case, data param, too many) | Fall back to the expanded form (existing #24176/#24177 behaviour). |
| Mapped-over steps | One value applies to all jobs of the step. That matches the expanded form. |
| Tool version changed between run and rerun | The run dict reflects the current tool. Existing `step_version_changes` messaging covers it, and keys that fail to resolve are dropped with a warning. |

## API contract

**Already exists (no change needed for first pass on tool steps):**

- `POST /api/workflows/{id}/invocations` with `parameters: {"<order_index>": {"a|b_0|c": v}}`, `parameters_normalized: true` and `inputs_by: "step_index"`. Subworkflow form: `{"<outer>": {"<inner>|a|b": v}}`. Unknown outer or inner index gives a 400.
- `GET /api/workflows/{id}/download?style=run&invocation_id=` returns the tool tree with the original run's state (cases and repeat counts), which is the picker source.
- `GET /api/invocations/{id}/request` returns `parameters` with index-based keys, re-keyed for subworkflows (#24178) and imported invocations (#24175). This is the source for F3 and F4 prefill.

**Gaps:**

- **G1 (server, important): unknown param names in a tool step's dict are silently dropped.** This covers renamed params, inactive conditional cases and missing repeat instances, all in `ToolModule.compute_runtime_state` via `visit_input_values`. Add a check after the visit, so that keys not consumed produce a `RequestParameterInvalidException` when `parameters_normalized`. This is a strictness change, so it may need an opt-in flag. Note that the expanded form sends keys for params that may legitimately be absent, so this must be verified against its payloads first.
- **G2 (server): job/invocation parameter display has no machine keys.** `summarize_job_parameters` returns `text`/`depth`/`value` only. F3 needs `name` (the prefixed path) on each row and an "exposable" flag, or a new `GET /api/invocations/{id}/step_parameters?step=`. Alternative: map labels client-side against the run dict, which is fragile.
- **G3 (server): subworkflow inner non-runtime params are not in the run dict.** `SubWorkflowModule.get_runtime_inputs` lists only RuntimeValue params. To expose any inner tool param, either add a `style=run` option that returns inner tool form trees, or let the client fetch the inner workflow's run dict per subworkflow step. It also needs verification that non-runtime inner keys sent in `parameters` actually reach the sub-invocation's `param_map` (via `workflow_run_config_to_request` `param_map.get(step.id)`, fixed in #24178) and apply inside it. This is unverified.
- **G4 (client): route plumbing.** `workflows/run` and `workflows/rerun` need a `step_param` (repeatable) query → `exposedStepParams` prop through `WorkflowRerun` → `WorkflowRun` → `WorkflowRunFormSimple`.
- **G5 (client): gating.** `simpleFormDisabledReason` treats any `parameters` in the rerun export as disqualifying. It needs an "exposable subset" check (F4).
- **G6 (optional): landing.** Landing `request_state` could carry `parameters` and an exposure list for preset links. This needs a decision on whether landings may set step params.
- **G7 (server, optional, for F4 quality): a minimal diff.** Exports from expanded-form runs include every param. Either diff on the client against the run dict defaults, or have `/request` mark which step params differ from `step.state`.

## Reusable pieces

- `visitInputs` / `matchCase` (`components/Form/utilities.js`): tree walk and active case. The picker tree builder should be a pure module (e.g. `Workflow/Run/stepParameterTree.ts`) with vitest coverage, sharing prefix rules with `visitInputs`, not reimplementing them.
- `FormDisplay` / `FormElement`: render bonus leaves. The simple form already builds inputs this way.
- `WorkflowRunModel.isConnected`: the connected-input exclusion.
- `withRerunValues`, `rerunInputValue` and `mountRerun` (#24176/#24177): rerun prefill helpers and test harness. Add a `rerunStepParameterValue(request, exposureKey)` next to them.
- `WorkflowStep.step_parameters_by_index` / `_by_id` and `resolve_step_parameters` (#24178): the server key policy. G1/G2 should reuse it, not add another.
- `simpleFormDisabledReason.ts`: the place to encode the F4 gate.
- `JobParameters.vue`: host for the F3 row action, once G2 adds names.
- Tree UI: check for an existing tree/accordion component before building one (e.g. the tool panel and workflow editor use collapsible lists).

## Testing plan (red → green)

- Vitest:
  - Tree builder: exclusions, active case only, repeat instances, subworkflow keys.
  - Exposure-key parse and resolve, including drop and warn.
  - Simple-form submit payload with bonus params.
  - F4 gating.
- API:
  - Simple-shaped payload with `parameters` for nested conditional, repeat and section keys.
  - G1 strictness: unknown key → 400.
  - Subworkflow inner non-runtime key applies (G3 verification).
- Playwright: add a param, run, and check the job param in the invocation view. Then F3 from the invocation view, then rerun with the prefilled card.

## Decisions

1. F4: invocations record the exposure keys explicitly (new invoke field, returned by `/request`, kept through import/export). Rerun must re-show exactly those keys, prefilled. This replaces the "small set"/diff heuristic, so G7 is dropped. Invocations without recorded keys keep the expanded-form gate.
2. G1: strict rejection of unknown keys is on by default. Audit and fix callers, including the expanded form.
3. Preset values via the URL (`step_param_value`) are supported. Landing requests are out of scope for the first pass (G6 is deferred).
4. Subworkflows expose the full inner tree, recursively (G3 is in scope).
5. Exposure keys use the 0-based `order_index`, consistent with the rest of the API.
