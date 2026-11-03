Run via Claude Opus at high effort.

# Phase B: API first

The branch's bottom three commits are now a self-contained API series. They cherry-pick cleanly onto current `origin/dev` (`38dc259318c`). A local `workflow_step_parameter_overrides_api` branch proves the extraction, and the API tests pass there and on the full branch.

- The extracted commit 1 adds two `dev`-only lines on top of its clean pick:
  - the `param_map.get(step.id)` fix;
  - a `None` guard in `dev`'s `STEP_PARAMETERS` branch, which mypy needs now that the rows are typed.
- `schema.ts` regenerated on the extracted branch matches what the commits carry.
- The extracted PR conflicts with #24178 in one place, `dev`'s `STEP_PARAMETERS` branch, in either landing order. Taking #24178's side resolves it, and the resolved file is byte-identical to the full branch's.

Nothing was pushed. No security-sensitive findings.

## Commits

`workflow_step_parameter_overrides`, over `46db8f9d5b6` (old HEAD `385a31a2a3a`):

| SHA | Commit | Series |
|---|---|---|
| `c71f0f0b5aa` | Add step_parameter_overrides to workflow invocation requests | **API** |
| `74cc2a84b7f` | Give overridable job parameter display rows their nested tool state path | **API** |
| `811c27a52bb` | List subworkflows' tool steps and their inputs in the workflow run form data | **API** |
| `ea459e39050` | Choose tool step parameters to override in the simple workflow run form | client (needs #24177) |
| `32ca999aef6` | Rerun a workflow with one of a step's job parameters changed | client (needs #24177) |
| `31495d2ca9a` | E2E: choose, rerun and link step parameter overrides in the simple run form | E2E |

Commits 2 (`parameters_display` paths) and 3 (`subworkflow_steps` run data) stay in the API series. Each is a small, additive API change with its own API test, and neither needs the stack.

`workflow_step_parameter_overrides_api`, local only, over `origin/dev` `38dc259318c`:

| SHA | Picked from | Difference |
|---|---|---|
| `60b7dff6efc` | `c71f0f0b5aa` | Adds `param_map=run_config.param_map.get(step.id)` in `workflow_run_config_to_request`, and the `None` guard in `dev`'s `STEP_PARAMETERS` branch (below). The commit message has a paragraph about both. |
| `515ddf3872a` | `74cc2a84b7f` | none (`git range-diff` shows it identical) |
| `729fd71f33e` | `811c27a52bb` | none (only diff context differs, from #24176's lines) |

All three picks applied cleanly. The two lines were then amended into the extracted commit 1. Neither can be part of a clean pick, because the stack already has both: `.get(step.id)`, and a `resolve_step_parameters` branch that handles `None`.

- **`param_map` fix.** Without it, `dev` gives child invocations no step rows. I confirmed this on the extracted branch: with the line reverted, `test_overrides_apply_inside_subworkflow_on_top_of_parameters` fails (`assert None == {'1': {'mode': 'careful'}}` on the child invocation's `/request`).
- **`None` guard.** On `dev`, `WorkflowInvocation.input_parameters` is an untyped `relationship(...)`, so the serializer's loop variable used to be `Any`. It now iterates typed `WorkflowRequestInputParameter` rows. mypy then flags `int(parameter.name)` and `json.loads(parameter.value)` (`str | None`), which CI's `make mypy` would fail on. The `STEP_PARAMETERS` branch now raises the same `InconsistentDatabase` up front when `name` or `value` is `None`. Before, a `None` name raised it through the caught `TypeError`, and a `None` value was an uncaught `TypeError`.

## What changed and why

### `/request` subtraction on stored rows (stack independence)

- **Old:** after the loop, `services/invocations.py` subtracted `flatten_step_parameter_overrides` output from the request-form `step_param_map`. That output is keyed by order index, with `"<inner index>|name"` for subworkflows, so it only matched #24178's `resolve_step_parameters` format.
- **New, in `step_parameter_overrides.py`:**
  - `recorded_step_parameter_overrides(invocation)` reads the meta row.
  - `stored_step_parameter_overrides(steps, overrides)` flattens the overrides into the stored row form. It is keyed by `str(step.id)` and nests subworkflows by inner step id, which is exactly what `apply_step_parameter_overrides` writes into `param_map`.
  - `request_parameters_without_step_parameter_overrides(invocation, overrides)` returns the invocation's request parameter rows with the override-set values removed from step parameter rows, before anything re-keys them.
    - A row with values left becomes a detached `WorkflowRequestInputParameter` copy. Its `workflow_invocation` is set with `set_committed_value`, so the backref doesn't add it to the invocation's parameters or the session.
    - A row with nothing left is dropped.
    - Rows that don't parse are returned unchanged, for the loop to report as before.
- **The serializer only changes its loop header:** `for parameter in request_parameters_without_step_parameter_overrides(...)`. The `STEP_PARAMETERS` branch, which is the code #24178 rewrites, is untouched.
  - On `dev` that branch runs `json.loads(parameter.value)`. On the stack it runs `parameter.resolve_step_parameters()`, which re-keys the copy through its `workflow_invocation`.
  - Both see the subtracted rows, so one commit works on both, and it cherry-picks cleanly.
- **Alternatives I rejected:**
  - Subtracting inside the `STEP_PARAMETERS` branch. That is the most natural spot on each base, but the branch differs between `dev` and the stack, so no clean pick is possible and the two PRs would conflict there.
  - Post-loop subtraction that accepts both key formats. It leaves format-detection code that is dead on one base.
- `services/invocations.py` no longer needs `import json`. #24178 removes that import, and the extracted commit doesn't re-add it, so a rebase can't silently drop an import that is still used.
- `"step_parameter_overrides"` (the meta row name) is now the constant `STEP_PARAMETER_OVERRIDES_PARAMETER`, shared by the writer in `run_request.py` and the reader.

### Placement moves for clean picks

- **`schema/workflows.py`:** the `STEP_PARAMETER_OVERRIDES_*` constants and `StepParameterOverridesField` moved from just after `STEP_PARAMETERS_DESCRIPTION`, which the stack edits, to after `ReplacementParametersField`.
- **`workflow_fixtures.py`:** the three fixtures moved from the end of the file, where `dev` has since appended `parameter_input_workflow`, to just before `WORKFLOW_KEEP_SUCCESSFUL_DATASETS`.
- **`managers/workflows.py` (commit 3):** `_tool_step_run_model` and `_subworkflow_run_steps` moved from just before #24176's `_compute_seeded_runtime_state` to just before `_workflow_resource_parameters`.
  - The `subworkflow_steps` assignment stays after `step_model = {"inputs": input_dicts}`, one unchanged line from #24176's seeding lines. Git merges that cleanly.

### Test format independence

`test_overrides_apply_inside_subworkflow_on_top_of_parameters` asserted the parent's `parameters == {"1": {"1|mode": "careful"}}`, which is #24178's format. On `dev` the same report is `{"1": {"<inner step id>": {"mode": "careful"}}}`. A small `_inner_step_parameters` helper now reads either form, and the test asserts `{"mode": "careful"}`. The child invocation's `/request` assertion is unchanged, since it is the same on both bases.

### mypy (typing only)

Phase A reported mypy clean, but it ran mypy from the repo root. That makes modules resolve as `lib.galaxy.…`, so `mypy.ini`'s per-module sections don't apply. Run from `lib/`, the way `make mypy` runs it, the strict, non-red-listed `galaxy.workflow.step_parameter_overrides` had 7 errors at `385a31a2a3a`, which CI would fail on. Fixed in commit 1 without behavior change:

- `isinstance(module, ToolModule)` before `module.tool`;
- a `_case_inputs` helper (`cases[i].inputs or {}`);
- `case.inputs or {}` in the inactive-case check;
- an `assert test_param` in `_case_for`.

## Tree diff `385a31a2a3a..31495d2ca9a`

`client/` is byte-identical, `schema.ts` included, so I skipped E2E. Seven files differ:

| File | Difference | Justification |
|---|---|---|
| `lib/galaxy/workflow/step_parameter_overrides.py` | The index-keyed `flatten_step_parameter_overrides` is replaced by `stored_step_parameter_overrides`, `_without_overrides`, `recorded_step_parameter_overrides` and `request_parameters_without_step_parameter_overrides`; adds the `STEP_PARAMETER_OVERRIDES_PARAMETER` constant; the mypy fixes above | Stack independence; typing only |
| `lib/galaxy/webapps/galaxy/services/invocations.py` | Reads overrides before the loop, iterates the subtracted rows, drops the in-loop meta read, the post-loop subtraction and `_without_step_parameter_overrides`; drops `import json` | Stack independence. Same result: the same keys are dropped (a value is dropped only where the override set the same value), a fully subtracted step is omitted, and malformed rows raise the same `InconsistentDatabase` |
| `lib/galaxy/workflow/run_request.py` | The meta row is written with the constant instead of the literal | Same value |
| `lib/galaxy/schema/workflows.py` | Pure move (sorted-line diff is empty) | Clean pick |
| `lib/galaxy_test/base/workflow_fixtures.py` | Pure move (sorted-line diff is empty) | Clean pick onto current `dev` |
| `lib/galaxy/managers/workflows.py` | Pure move of two methods (sorted-line diff is empty) | Clean pick |
| `lib/galaxy_test/api/test_workflow_step_parameter_overrides.py` | `_inner_step_parameters` and the format-independent parent assertion | The test runs on both bases |

## Anticipated conflicts with the stack

I simulated both landing orders with `git merge-tree`, merging the extracted branch with `jmchilton/issue_24178_subworkflow_step_params_export` (`57bf3eebd77`) and with the full stack head (`46db8f9d5b6`).

- **One conflict: `services/invocations.py`, the `STEP_PARAMETERS` branch.** The extracted commit's `None` guard and #24178's `resolve_step_parameters()` rewrite touch the same lines.
  - **Resolution, in either order:** take #24178's side. I resolved the simulated merge that way: the resulting file is byte-identical to the full branch's `services/invocations.py` (`31495d2ca9a`), and `ruff --select F` is clean on it. #24178 already guards `None`, so the guard has nothing left to do.
  - Together, #24178's removals of `import json` and `steps_by_id` keep the file consistent. The API's own code doesn't use `json` there, since the override helpers live in `step_parameter_overrides.py`.
  - `resolve_step_parameters()` receives the detached copies and re-keys the subtracted values. The full branch (stack + API) exercises exactly this, including the mixed subworkflow test.
- **`run_request.py`:** both sides make the same `param_map.get(step.id)` change, which merges cleanly.
- **`schema/workflows.py`, `schema/invocation.py`:** #24178's description edits and the API's additions are at least one line apart. They merge cleanly.
- **`schema.ts`:** it merges cleanly. Regenerate after the rebase as a check: it should equal the full branch's `schema.ts`.
- **`lib/galaxy_test/base/populators.py`:** the stack head's only other conflict. It also occurs merging the stack into plain `origin/dev`, so it is the stack's own drift, not caused by the API.
- **The format-independent test** passes against either `/request` format, so whichever lands second needs no test change.
- **#24176 and #24177** (`_workflow_to_dict_run` seeding, client run form): commit 3's insertions are separated from #24176's lines and merge cleanly. The client and E2E commits stay on the full branch, on top of the stack.
- **When rebasing the full branch after the API PR merges:** drop the three API commits, which will match `dev`. Nothing else in the full branch touches the API files.

## Test results

### Full branch `workflow_step_parameter_overrides` @ `31495d2ca9a`

- **New API tests**, `test_workflow_step_parameter_overrides.py` + `test_jobs.py -k parameters_display`: **13 passed**.
- **Existing step-parameter API tests**, `test_workflows.py -k "step_param or request or run_form or rerun or subworkflow_param or runtime_param or parameters_normalized or test_parameters_display"`: **27 passed**.
- **Doctest** for `step_parameter_overrides.py`: 1 passed.
- **Vitest** (node 22.20.0) on `Workflow/Run/`, `JobParameters`, `WorkflowInvocationState` and `JobInformation`: **31 files, 175 tests passed**.
- **Lint:**
  - ruff, black and isort (`.venv`) are clean on the 11 changed Python files.
  - eslint reports 0 errors and 31 warnings. The warnings are Phase A's existing `any` warnings, and the client is unchanged.
  - prettier is clean on the changed client files and `navigation.yml`.
- **mypy from `lib/`** on the changed server modules: clean, apart from one error in `galaxy/managers/notification.py`, which the branch doesn't touch.
- **E2E:** skipped, since the client tree is byte-identical to `385a31a2a3a`.

### Extraction branch `workflow_step_parameter_overrides_api` @ `729fd71f33e`

- **`schema.ts`** regenerated (`dump_openapi_schema.py`, `openapi-typescript`, `prettier`) at `0ee0b92e465`: byte-identical to the committed file. No regeneration commit is needed. The `None` guard added after that build doesn't touch the schema.
- **New API tests** (same selection): **13 passed**.
- **Existing step-parameter API tests** (same selection): **18 passed, 6 failed**. The 6 failures are environmental and also fail on plain `origin/dev` (below).
- **mypy from `lib/`** on the changed server modules: clean, apart from the unrelated `notification.py` error. ruff and black are clean.
- **Commit 1 alone** (`46b46aa258b`, an earlier build of the extracted commit 1 without the typing fixes and the `None` guard): 10/10 new API tests passed. Reverting the `param_map` fix failed the mixed subworkflow test, as described above.

The `.venv` has `gxformat2==0.27.0`, the stack's pin, while `dev` pins `0.29.1`. Six `dev` tests on parameter input bounds and regex validators fail on plain `origin/dev` with this venv, with the same six failures:

- `test_run_format2_workflow_rejects_out_of_range_int_parameter`
- `test_run_format2_workflow_rejects_regex_mismatch_text_parameter`
- `test_run_format2_workflow_rejects_negated_regex_match_text_parameter`
- `test_run_format2_workflow_min_only_int_parameter`
- `test_numeric_input_bounds_reach_run_form`
- `test_numeric_input_inverted_bounds_rejected_on_run_form`

They are environmental. I didn't upgrade the shared venv, to keep the stack's environment as it is.

## Not done / follow-ups

- Commit 1 on the full branch was tested at HEAD only; each later commit only adds code and tests. On the extracted branch, I also ran commit 1 on its own, at an earlier build.
- The detached-copy approach is the one spot a `dev` reviewer may question. If they prefer, the subtraction can move into the `STEP_PARAMETERS` branch on each base. That branch already conflicts (above), so the cost is a less mechanical resolution: apply `_without_overrides` to the loaded row before `step_parameters_by_index`.
- Nothing pushed. The worktree is back on `workflow_step_parameter_overrides`.
