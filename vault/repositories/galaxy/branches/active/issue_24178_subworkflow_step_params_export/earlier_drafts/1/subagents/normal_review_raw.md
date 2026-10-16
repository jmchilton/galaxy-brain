# Normal review: issue_24178_subworkflow_step_params_export (raw)

Reviewed commit `7f219621ca5` on origin/dev `88127f42979`. Applied `vault/agents/_shared/REVIEW_FOCUS.md` plus the branch-specific asks.

**Verdict:** correct and appropriately small. No must-fix findings. The helper pair is the right reusable abstraction for #24175 and #24176. The remaining findings are test-cost and error-message polish.

Checks run:
- `pytest test/unit/workflows/test_run_parameters.py`: 13 passed.
- `cd lib && mypy galaxy/workflow/run_request.py galaxy/webapps/galaxy/services/invocations.py`: no errors in the touched files. The 23 errors it reports are pre-existing env noise in unrelated modules.
- Probed the unit fixture's DB ids: outer `[1, 2]`, subworkflow `[3, 4, 5]`, nested `[6]`. Ids differ from order indices at every level, so id/index swaps would be caught.
- API tests not run.

## Correctness of the helpers (`lib/galaxy/model/__init__.py:9629-9662`)

- **Round trip is correct.** `step_parameters_by_index` uses `int(inner_step_id)`, so it handles the string keys that come back from JSON at every nesting level. The unit test exercises that with `json.loads(json.dumps(...))`. `split("|", 1)` keeps tool names that contain `|` intact (`"1|seed_source|seed"`). It also recurses correctly for nested subworkflows (`"2|0|seed_source|seed"`).
- **The id-keyed output matches the consumer.** `WorkflowModuleInjector.inject` (`lib/galaxy/workflow/modules.py:3610-3613`) does `int(key)` on the stored subworkflow map and recurses through `populate_module_and_state`. The `{inner_id: {...}}` / `{inner_id: {nested_id: {...}}}` shape is the same as the old recursive normalizer produced. Nothing stored changes.
- **Good reusable home.** Both methods depend only on `self.subworkflow`, so the model store can use them for #24175: `by_index` against the source step at export, `by_id` against the target step at import. #24176 run-form seeding needs only `by_index`. Placing them on `WorkflowStep` rather than in `run_request.py` is right, because `galaxy.model.store` should not import from `galaxy.workflow`.
- **Typing.** `step_parameters_by_id -> dict[Any, Any]` is loose, but it is honest given the pass-through for non-subworkflow steps. Not worth a union.

## `_normalize_step_parameters` narrowing (`lib/galaxy/workflow/run_request.py:186-191`)

- **Unknown or non-numeric inner index now returns 400 instead of being silently dropped.** This is intended and documented in the issue. The run form (`SubWorkflowModule.get_runtime_inputs`, `modules.py:1007-1029`) only emits `"<tool step order_index>|name"` keys for the current workflow version. Rerun exports are posted with `instance: true` against the same version. So legitimate callers are unaffected. The one exception is a hand-saved request replayed against an edited workflow, which now fails loudly instead of quietly dropping the stale params. That is arguably better.
- **The inner `parameter_input` "must specify 'input'" check no longer runs for inner steps.** It was added in `d8c6b0c76fa` (mvdbeek, 2026-10-03) to reject legacy top-level wrappers. The legacy `{"input": ...}` → `inputs` translation (`run_request.py:371-379`) only applies to outer steps. The run form never emits params for inner parameter_input steps, because `get_runtime_inputs` only visits tool steps. So the check only guarded an unsupported path. Losing it doesn't matter in practice, but it should be mentioned in the PR description as a deliberate narrowing (see nit 5).
- Minor drift, harmless: `int(" 1")` and `int("01")` are now accepted as index 1, where the old string match ignored them.

## Findings

### should-fix

1. **Drop the dataset upload from the invalid-key API test.** `lib/galaxy_test/api/test_workflows.py:5758`
   `_normalize_step_parameters` runs at `run_request.py:338`, before any input handling, so the 400 fires without inputs. The `new_dataset(..., wait=True)` upload adds a slow, timeout-prone step (the first upload often times out on the loaded machine/CI) and isn't needed for what the test checks.
   Suggestion: remove `hda` and the `"inputs"` / `"inputs_by"` keys, keeping only `history_id`, `parameters` and `parameters_normalized`. If the invoke route turns out to need `inputs`, pass `{}`.

### nit

2. **The 400 message is misleading for an unknown index.** `lib/galaxy/workflow/run_request.py:188-191`
   For `"9|num_lines"` the key is already shaped `<index>|<name>`, but the message says it "must be keyed as" that. The `KeyError` from `Workflow.step_by_index` already says "Workflow has no step with order_index '9'".
   Suggestion: catch `as e` and append the detail, e.g. `f"Invalid parameters for subworkflow step {step.order_index} ({e}); keys must be '<subworkflow step index>|<name>'."`. Keep the `<subworkflow step index>|<name>` substring the API test asserts.

3. **Possible test overlap in the top-level baseline API test.** `lib/galaxy_test/api/test_workflows.py:5719-5732` (`test_workflow_request_step_parameters_rerun`)
   It already passes on dev, and it largely overlaps `test_run_replace_params_over_default` (line ~10508), which exports `num_lines`, asserts it, and reruns. What's new is the conditional flat key `seed_source|seed` and the equality check on the rerun's export. That's two more workflow runs on CI for little red-to-green value.
   Suggestion: drop it, or fold the `rerun_request["parameters"] == ...` assertion and a conditional key into the existing test. Keep it only if John wants an explicit top-level baseline next to the subworkflow test.

4. **Unit fixture duplicates an existing helper.** `test/unit/workflows/test_run_parameters.py:175-203` (`__nested_subworkflow_fixture`)
   `test/unit/workflows/workflow_support.py:yaml_to_model` already builds subworkflow models (including nested ones) with fixed offset ids (`id_offset=100`) specifically "to test against assumption order_index != id". It's used by `test_modules.py`, `test_workflow_progress.py` and others.
   The new fixture gets distinct ids only by accident of DB insert order. Verified: ids 4/5/6 against indices 1/2/0.
   Suggestion: replace it with a small YAML dict passed to `yaml_to_model`. That drops the DB round trip and the hand-rolled `new_workflow` builder. Optional: the current fixture works.

5. **Mention the dropped inner-step validation in the PR description.** No code location.
   The PR description should say that inner `parameter_input` steps no longer get the legacy "must specify 'input'" check, and that unknown inner indices are now a 400. Otherwise a reviewer (mvdbeek wrote that check two weeks ago) has to rediscover it.

6. **Inner-step failures in the export are not wrapped.** `lib/galaxy/webapps/galaxy/services/invocations.py:375-376`
   A `KeyError`/`ValueError` from `step_parameters_by_index` (a stored inner id not in the subworkflow) surfaces as a 500. That is consistent with the pre-existing unwrapped `steps_by_id[step_id]` outer lookup, and only reachable for imported invocations, which is #24175's scope. So leave it. Just make sure the #24175 sibling covers the inner lookup too.

7. **Docstring omits a raise.** `lib/galaxy/model/__init__.py:9630-9632`
   The `step_parameters_by_index` docstring lists only `KeyError`, but `int(inner_step_id)` can also raise `ValueError` for a non-numeric stored key.
   Suggestion: say "Raises KeyError/ValueError for an inner step id not in this subworkflow", or leave it, since stored keys are always `str(step.id)`.

## Not flagged / settled

- The latent `run_config.param_map.get(step.order_index)` read for subworkflows in `workflow_run_config_to_request` (`run_request.py:599`). `param_map` is keyed by step id there. Known and settled per instructions.
- Imports are at module top. The new comment in the unit test ("Stored as JSON, so inner step ids come back as strings.") is non-obvious and worth keeping. The rest of the code has no obvious comments, and the old `# TODO: test subworkflows` was correctly removed along with the useless `step_id: int` annotation.
- The `"<order_index>|name"` format is now built in two places: `SubWorkflowModule.get_runtime_inputs` (`modules.py:1024`) and `step_parameters_by_index`. A shared formatter would be over-abstraction for an f-string.
- The test changes only add new tests; no existing assertions were weakened.
- The subworkflow API round-trip test is solid. It asserts the export shape (red on dev), the behavioral effect on rerun (2 lines; the tool default would differ), and that the rerun's export matches too.
