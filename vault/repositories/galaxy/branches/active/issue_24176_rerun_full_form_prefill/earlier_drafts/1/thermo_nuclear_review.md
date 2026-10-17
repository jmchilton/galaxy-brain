# Thermo-nuclear code quality review

Scope: `git diff 5cf81e75c12..HEAD` (head `bab10d268ef`), Python and client. Verdict: approve after two small tidies. No structural regression, and no clean code-judo move went unused. The server/client split of rerun prefill is justified: tool state has to be validated server-side, while input steps, workflow parameters and resource params are already client-owned. I acted on two items. Both are uncommitted in the worktree.

- **`_compute_seeded_runtime_state` reshaped, same behavior** (`lib/galaxy/managers/workflows.py`).
  - The missing-tool guard moved to the dispatch site: `isinstance(module, ToolModule) and module.tool and recorded`. Before, the helper repeated the caller's unseeded `compute_runtime_state(step)` branch inside itself. Now its precondition is simply "tool present".
  - The "re-inject, then compute" reset is written once, in a loop over the two fallbacks (`valid_args`, then `None`, the saved state).
  - The order of attempts is unchanged: seeded, then without the errored values, then saved state.
- **`_find_run_input` test helper** (`lib/galaxy_test/api/test_workflows.py`): an iterative walk replaces the recursion that used try/except `KeyError` for control flow. Assertions are unchanged.

Validation after the changes:
- API `-k "test_run_form_seed or test_workflow_request_ or test_run_subworkflow_runtime_parameters"`: 13 passed. This includes the purged-dataset test, which exercises the fallback loop.
- black, isort and ruff 0.17.0 are clean.
- mypy from `lib/` reports no errors in `managers/workflows.py`. The 23 errors it does report are pre-existing, in other modules.
- No client edits, so no client rerun.

## Not acted on

- **Third copy of the STEP_PARAMETERS parse.** `WorkflowInvocation.recover_step_parameters()` is new. `serialize_workflow_invocation_to_request` (`webapps/galaxy/services/invocations.py`) and `workflow_run_config_to_request`'s inverse in `workflow/run_request.py` still parse the rows inline.
  - Refactor to make: have both call `recover_step_parameters()`. The services one then becomes `{str(steps_by_id[id].order_index): steps_by_id[id].step_parameters_by_index(p) for id, p in invocation.recover_step_parameters().items()}`.
  - Not done because the parent-introduced code there is also being edited by #24175 in parallel. Do it after the stack lands.
- **Subworkflow seeding isn't validated; tool seeding is.**
  - Tool steps go through `compute_runtime_state(step_args=...)`, which runs `check_param` and stringifies via `tool.to_json`. So `num_lines` comes back as `"2"`.
  - Subworkflow steps patch the raw recorded JSON into `input_dict["value"]` after the fact. So `1|num_lines` comes back as `2`.
  - Unifying isn't possible without plumbing. Subworkflow run inputs are `InputProxy.to_dict` → the tool parameter's own `to_dict` (its default), which never reads module state. Seeding inner state through `compute_runtime_state` wouldn't reach the dict.
  - It's low risk: subworkflow run inputs exclude data inputs, and recorded values validated when they ran.
  - Follow-up if wanted: let `InputProxy.to_dict` take a value (`other_values`) so both step types share one seeded path.
- **`_seedable_step_args` re-derives `${}` names** with `params_to_incoming` plus `"${" in value`. No canonical tool-state walker exists. `ToolModule.get_informal_replacement_parameters` only scans PJA arguments, using the regex `\$\{(.+?)\}`. The check is slightly looser than the client's regex, which is harmless.
- **Re-inject couples to the caller's inject kwargs.** The fallback re-injects with `exact_tools=False`, mirroring `inject_all` in `_workflow_to_dict_run`. Snapshotting state isn't viable: `DefaultToolState.copy()` is shallow and `ToolModule.get_runtime_state` aliases `self.state.inputs`. Re-inject is the canonical reset, so I left it.
- **`workflows.py` size.** The file was already 2802 lines and is now 2884, so the "crosses 1k" rule doesn't fire.
  - Moving the three seeding helpers into `lib/galaxy/workflow/` would move code without removing any concepts.
  - Worth revisiting only if the subworkflow/tool seeding unification above happens.
- **Client prop sprawl.** `WorkflowRerun` passes `request-state`, `rerun-request`, `rerun-invocation-id`, `is-rerun` and `simple-form-use-job-cache`, which are overlapping slices of one request. `isRerun` is derivable from `rerunRequest`, so the guard's `props.isRerun &&` is redundant.
  - Collapse these in #24177, which adds more `rerunRequest` reads. Changing them here would churn the same lines twice.
- **`getRunData` positional args are growing** (`version, instance, invocationId`). An options object would be nicer, but it changes the existing call sites and the vitest call assertion. Low value.
- **`stepModels` in `WorkflowRunForm`** maps model steps with `Record<string, any>`, and the per-step shaping ("an input step's first input holds the value") lives in the form.
  - It could move into `model.js` beside `rerunInputValue`. That's marginal; `model.js` is untyped JS either way.
- **`_find_input` in `test_workflow_build_module.py`** is a near-duplicate of `_find_run_input`.
  - It doesn't walk section/repeat `inputs`, it returns `None` instead of raising, and it lives in an unrelated module. Promoting a shared helper into `galaxy_test.base` isn't worth the diff here.
- **Legacy `effective_label` lookup gap.** Pre-existing and deferred (see `codex_review.md`).

<details><summary>Full review</summary>

### 1. Structural regressions
None. The server change extends `_workflow_to_dict_run` through one dispatch point in the runtime-state loop and one in the step-model loop, each delegating to a named helper. The client change adds a prop and three computeds to `WorkflowRunForm`, and extracts `rerunInputValue` out of `WorkflowRunFormSimple`. That extraction is a net simplification: the simple form lost 28 lines of inline branching.

### 2. Code-judo opportunities
- **Server seeding vs. full client merge.** Considered and rejected. Tool state needs `check_param` (conditionals, select validity, purged datasets). Replaying that client-side would duplicate server parameter logic. The opposite move, the server seeding everything (input steps, wp inputs, resource params, `use_cached_job`), would drag client-owned derivations into the API. Workflow parameter inputs, for example, are synthesized client-side from `${}` scanning. The split follows existing ownership. It's already listed as a reviewer question.
- **Unify tool and subworkflow seeding** through `compute_runtime_state`. This is blocked by `InputProxy.to_dict` ignoring module state (see Not acted on). It's the only code-judo move visible, and it needs plumbing in `modules.py`.
- **Seeding via `inject_all(param_map=...)`.** Rejected. For subworkflow steps that would run `populate_module_and_state` with the recorded values, turning inner `RuntimeValue`s into literals. `SubWorkflowModule.get_runtime_inputs` would then stop exposing those inputs, and it raises on validation errors.

### 3. Spaghetti / branching
- `_compute_seeded_runtime_state` had the missing-tool special case inside the helper, which duplicated the caller's else-branch. It also had the reset sequence (`inject` + `compute`) written twice. **Fixed.**
- `_workflow_to_dict_run` gains an invocation guard at the top: a version-mismatch `log.debug` and `recover_step_parameters()`. It's acceptable: it's 5 lines, and it runs before the existing step/cycle validations, so a corrupt-row `InconsistentDatabase` surfaces first. Nit only.
- `WorkflowRun.loadRun` adds one rerun branch after the three existing simple-form checks. It's consistent with those checks. The redundant `isRerun` term is noted above.

### 4. Boundaries / types
- `workflow_to_dict(..., invocation=)` is a style-specific kwarg on the general export entry point, ignored for non-run styles. It's documented in the docstring. Acceptable, given the existing style-specific kwargs (`history`, `preserve_external_subworkflow_links`).
- `recover_step_parameters()` on the model is the right layer, next to `recover_inputs()`. The duplication is in the other callers (see Not acted on).
- Client: `rerunRequest?: WorkflowInvocationRequest` is typed with the schema type, which is good. `stepModels` uses `Record<string, any>`, inherited from the untyped `model.js`.
- The controller resolves the invocation with `workflow_manager.get_invocation`, so access checks are canonical and tested (403).

### 5. File size
`managers/workflows.py` was already over 1k lines (2802 → 2884). `WorkflowRunForm.vue` grows from 368 to 401 lines, and `model.js` from 239 to 278. No threshold crossings.

### 6. Modularity
`rerunInputValue` and `rerunHasStepParameters` in `model.js` give #24177 a single home for rerun-request interpretation. Good.

### 7. Legibility
- `_find_run_input` used recursion with try/except `KeyError` as control flow. **Fixed.**
- Docstrings and comments are concise.

</details>
