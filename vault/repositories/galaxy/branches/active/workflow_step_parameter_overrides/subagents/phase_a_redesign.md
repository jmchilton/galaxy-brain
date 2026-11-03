Run via Claude Opus at high effort.

# Phase A: step_parameter_overrides redesign

Built the `step_parameter_overrides` API as written in [api_design.md](../api_design.md), plus the simple-form picker, cards, link argument, rerun re-show, the job-parameter "rerun with this changed" action and E2E tests. One deviation (conditional case switches record the new case's defaults, below). Nothing pushed.

## Commits

On `workflow_step_parameter_overrides`, over `46db8f9d5b6`:

| SHA | Commit |
|---|---|
| `bfc321b6c16` | Add step_parameter_overrides to workflow invocation requests |
| `b76550de6a9` | Give overridable job parameter display rows their nested tool state path |
| `f3f69596f64` | List subworkflows' tool steps and their inputs in the workflow run form data |
| `ff4a088b846` | Choose tool step parameters to override in the simple workflow run form |
| `38fe3e49c9d` | Rerun a workflow with one of a step's job parameters changed |
| `e0bd9547b11` | E2E: choose, rerun and link step parameter overrides in the simple run form |

Server commits come first. Each server commit carries its API tests and its slice of the regenerated `schema.ts`.

## Server

- **New module** `lib/galaxy/workflow/step_parameter_overrides.py`.
  - `apply_step_parameter_overrides` walks the nested overrides beside each tool's inputs and the step's saved state. It merges flat `a|b` / `name_i|` names into the same per-step map `parameters` produces, keyed by step id and nested by inner step id for subworkflows. So `populate_module_and_state`, scheduling and subworkflow invocation are untouched.
  - `flatten_step_parameter_overrides` / `flatten_tool_state` turn validated overrides back into request-form names, for `/request`.
  - No existing flattener fit. `_flatten_step_params` only flattens dicts (no repeats), and its legacy behavior shouldn't change. `galaxy.tool_util.parameters` visitors work on the model layer, not workflow step state.
- **Validation:** 400 `RequestParameterInvalidException` with `err_data` keyed by a slash path (e.g. `2/cond/pattern`, the same key the client uses for cards). Each of these is rejected:
  - an unknown step;
  - a non-tool, non-subworkflow step;
  - an unknown parameter;
  - a parameter outside the active case (the case can come from the override's own test parameter, from `parameters`, or from saved state);
  - a test value that selects no case;
  - repeat instances the step doesn't have, or a non-list repeat;
  - a non-object section, conditional or instance;
  - data and collection parameters;
  - parameters connected to another step;
  - dict leaves: `__class__: Batch` and `{"batch": true}` give "batch values are not supported";
  - `__`-prefixed keys (post-job actions, `__current_case__`).
  - Values are still checked by `check_param` when runtime state is computed. A bad value gives the existing 400 "Error computing workflow step runtime state", with `err_data` per step.
- **On top of `parameters`:** overrides merge over the map `parameters` built.
- **Storage:** a `meta` `WorkflowRequestInputParameter` row named `step_parameter_overrides` holds the JSON. There is no migration: the value column is `TEXT`, and the row rides the existing model-store export/import of `input_parameters`.
  - The overrides also land in the `step` rows, because scheduling reads `param_map` from them. `/request` therefore drops override-set values from `parameters`, so an overrides-only run round-trips as overrides only (`parameters: null`), and a mixed run reports each field's own keys.
  - Subworkflow invocations record their slice in their own meta row. Their `/request` then reports overrides the same way.
- **Run data:** subworkflow steps carry `subworkflow_steps`. These are the inner tool steps' saved tool inputs (`tool.to_json` inputs only) and nested subworkflows, recursively, so the picker lists inner parameters.
- **G2 kept, reshaped:** `parameters_display` rows gain `path` (e.g. `["queries", 1, "column_name"]`). It is set only on parameters the run form can expose: text, integer, float, boolean, select and color, and not dynamic. Conditional test parameters and data-dependent parameters get none. No `name` or `exposable` fields.

## Deviation from api_design.md

**Switching a conditional's case records the new case's defaults.** The new case has no saved values, so `check_and_update_state` raised "Workflow step has upgrade messages" (400) for its missing parameters. The walker therefore fills those parameters with their defaults (recursing into sections and nested conditionals, skipping repeats) and applies and records the filled overrides. `{"cond": {"filter_type": "regex"}}` is recorded and returned by `/request` as `{"cond": {"filter_type": "regex", "pattern": ".*"}}`. That is exactly what the job got, and resubmitting it is equivalent. Without this, case switching, which the design says is allowed, could not work. Repeats inside a switched-to case start with no instances. A switched-to case whose repeat has `min > 0` may still 400 on upgrade messages (untested).

## Client

- `stepParameterTree.ts`:
  - The tree builder, now recursing into `subworkflow_steps`.
  - Leaves carry `stepPath` + `paramPath` and a `2/queries/1/column_name` key.
  - `buildStepParameterOverrides` nests values by path and pads repeats with `{}`. `stepParameterOverrideValues` reads overrides back by key. `typedParameterValue` types card values through `buildNestedState`, so `/request` records numbers and booleans, not strings.
  - Also `resolveStepParameterKeys`, `diffKeys` (from the graph alt) and `parseStepParameterOverridesArg`.
- `WorkflowRunStepParameters.vue`: the section (cards, dropped and link-error alerts, "Choose step parameters").
  - It is self-contained: `WorkflowRunFormSimple` passes `steps`, the rerun's recorded overrides and the link argument, then adds the emitted overrides to the payload.
  - `StepParameterPicker.vue` and `StepParameterTreeNode.vue` are the tree picker, now select/deselect: Apply sets the whole set. Phase C's graph view can sit beside the picker inside this section.
- **Route arg:** `step_parameter_overrides` on `/workflows/run` and `/workflows/rerun`. It is URL-encoded JSON, and a `null` leaf shows the workflow's (or the original run's) value with no preset. The old `step_param*` arguments are gone.
- **Rerun:** recorded overrides come back as cards with their recorded values ("original run: …"). Two cases go to the expanded form, which is seeded server-side with all recorded values:
  - Runs with legacy `parameters` keep the #24177 fallback.
  - The new `rerunHasUnshownStepParameterOverrides` reason covers recorded overrides the tree can't show (e.g. a switched case), with its own alert text.
- **Row action:** "rerun with this changed" on job parameter rows that have a `path`. It links to `/workflows/rerun?invocation_id=…&step_parameter_overrides={"<step>": {…: null}}`.
  - It is guarded for subworkflow invocations: `JobStep` lists the job's invocations with `include_nested_invocations=false` (an existing API) and offers the action only if this invocation is among them. `isTopLevelInvocationJob` is in `api/invocations.ts`.
- `navigation.yml` has `workflow_run.step_parameters.*` and `invocations.rerun_with_this_changed` targets. There are no raw selectors in the E2E tests.

## Tests

- **API** (`lib/galaxy_test/api/test_workflow_step_parameter_overrides.py`, new `echo_step_parameters` tool and three fixtures): **11/11 pass**. They cover:
  - merging into saved state (section, repeat by position, conditional, boolean);
  - a case switch, and a case switch filling defaults;
  - on top of `parameters`, with `/request` splitting the two fields;
  - one and two subworkflow levels deep, including the subworkflow invocation's own `/request`;
  - 15 top-level and 4 subworkflow 400 cases, plus a bad value;
  - export/import;
  - `parameters_display` paths;
  - the run form's `subworkflow_steps`.
- **Existing API:** `test_workflows.py -k "step_param or request or run_form or rerun or subworkflow_param or runtime_param or parameters_normalized or test_parameters_display"`: **27/27 pass** (before and after the branch's last server change).
- **Doctest** for `flatten_tool_state`: passes.
- **Vitest** (node 22.20.0): `Workflow/Run/`, `JobParameters`, `WorkflowInvocationState` and `JobInformation`: **31 files, 175 tests pass**. New: `stepParameterTree.test.ts` (13), `WorkflowRunStepParameters.test.ts` (5), `simpleFormDisabledReason.test.ts` (3), and 2 payload tests in `WorkflowRunFormSimple.test.ts`.
- **E2E** (Playwright, headless): new `test_workflow_run_step_parameter_overrides.py` **6/6 pass**. Existing `test_workflow_rerun.py` + `test_workflow_run.py`: **38/41 pass**. The 3 failures look environmental, not related to this change: `test_workflow_export_file_rocrate` and `_native` time out waiting for export format cards (no writable file source configured), and `test_upload_list_paired_from_workflow` times out waiting on an upload to reach `ok`..
- **Lint:** ruff, black and isort are clean. mypy reports nothing in the new module (strict, so annotated); `mypy` on single files is noisy with pre-existing errors elsewhere. eslint has no errors (only `any` warnings on tool-input JSON, as in the spike) and prettier is clean. `vue-tsc --noEmit` is clean after rebuilding `@galaxyproject/galaxy-api-client`'s dist.

## Environment notes

- The `.venv` lacked `psycopg[binary]`: pytest-postgresql failed to import. I installed `psycopg-binary==3.3.6` into it.
- Playwright's Chromium needed system libraries. I ran `sudo playwright install-deps chromium`.
- `galaxy_e2e.sh` is zsh-only and the box has no zsh, so I used a bash port in the session scratchpad.
- Against the Vite dev server, headless Chromium hit `net::ERR_INSUFFICIENT_RESOURCES` on repeated navigations: blank pages, `#masthead` and `.loggedin-only` timeouts. Existing tests failed the same way. I built the client (`pnpm run build`, staged into `static/dist`) and ran E2E straight against Galaxy (`GALAXY_TEST_EXTERNAL=http://localhost:8091/`).
- E2E servers are stopped. `static/dist` holds the built client (ignored by git).

## Extraction onto dev (for the next agent)

- **The `/request` side assumes #24178's step-parameter format.** `serialize_workflow_invocation_to_request` uses `resolve_step_parameters`, which keys by order index with `"<inner index>|name"` for subworkflows. Commit 1's subtraction relies on that format. On plain `dev`, `/request` keys step rows differently, so this hunk needs rework or #24178.
- **Recording inner overrides needs #24178's one-line fix.** Subworkflow invocations get their `param_map` slice via `param_map.get(step.id)`, the #24178 fix; `dev` has `.get(step.order_index)`. Applying overrides to inner steps at invoke time works without it.
- The run form data change (commit 3) and the G2 path (commit 2) don't depend on the stack.
- The client commits depend on #24177's `simpleFormDisabledReason`, `withRerunValues` and the rerun prefill.

## Known gaps

- Server `err_data` paths aren't mapped back onto cards: errors show in the generic submission alert.
- The picker still locks conditional test parameters, though the API allows switching. Cards would need to re-render the new case's parameters.
- Data-dependent parameters (`data_column`) stay locked, as in the spike.
- The export/import test checks the meta row by re-exporting the imported invocation. It doesn't check `/request` of the import, which 500s on this stack until #24175 re-keys imported `step` rows ("saved workflow step parameters reference an unknown workflow step").
- Inner subworkflow leaves in a rerun show the workflow's saved value in the tree (the run data seeds only top-level tool steps). Cards show the recorded value.
- `InvokeWorkflowPayload` still ignores unknown fields, so an older server silently drops `step_parameter_overrides`.
- No security-sensitive findings.
