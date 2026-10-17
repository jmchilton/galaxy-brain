# Scope evaluation

**Recommendation: modest expansion.** Keep the one-line storage-time fix, and close the accepted shared-FS-lag edge with a 2-3 line pre-read in `WorkflowProgress.subworkflow_progress` (`run.py`, already touched). For each `parameter_input` subworkflow input, call `modules.replace_expression_json_dataset(replacement, step)` and discard the result, so a lagging `expression.json` delays the outer subworkflow step before any inner step can rename with a literal `${label}`. Add a red-to-green unit test, plus a comment-only refresh of the stale `InputParameterModule.execute` TODO (no code change in `modules.py`). Exclude the mapped-HDCA per-job dict (new plumbing, undefined for some shapes; separate issue), validation of expression-backed values (can newly fail working invocations; dev follow-up), and an older base.

## Possible Decompositions

The branch is about 206 lines: a 1-line fix, 127 lines of API tests, and a 78-line framework workflow test.

- **Single PR (as is).** The fix plus all three tests. This is the natural unit.
- **Two PRs.**
  1. The fix, with the framework test `replacement_parameters_nested_expression` and the issue-repro API test `..._collection_rename`.
  2. The mapped-subworkflow API test `test_run_mapped_subworkflow_expression_replacement_parameter`, as extra coverage of `_handle_mapped_over_post_job_actions`. It would land after 1, and is only useful if reviewers balk at test volume.
- **With the recommended expansion.** The lag pre-read and its unit test can ride in the same PR, or follow as a second commit or PR on top of the fix. It does not depend on the API tests.

## Scopes considered

### 1. As implemented: resolve at storage time

`set_outputs_for_input` stores `str(replace_expression_json_dataset(output_value, step))` for labeled parameter inputs. Tests cover tool and native `pick_value` renames inside a subworkflow, a mapped subworkflow's implicit collection name, and the reporter's zero-input `__BUILD_LIST__`.

| Pros | Cons |
|---|---|
| <ul><li>One line, and exactly the issue's suggestion.</li><li>Reuses the canonical helper.</li><li>Trivial forward merge to dev, which has the same line at `run.py:700`.</li><li>Should cover nested subworkflows: at every level, `compute_collection_info` → `replacement_for_input` (non-data) waits for the parameter dataset, and the innermost input step resolves it. Untested.</li><li>Reads once per iteration, at the step that holds the value.</li></ul> | <ul><li>Leaves the accepted lag edge in the reporter's exact shape. A zero-input inner step can schedule while the input step is delayed, which gives a permanent literal `${label}` name.</li><li>No unit-level test of the resolve.</li></ul> |

### 2. Recommended: as implemented, plus a lag pre-read in `subworkflow_progress`

In `subworkflow_progress`'s loop, after `replacement_for_connection`, add `if input_subworkflow_step.type == "parameter_input": modules.replace_expression_json_dataset(replacement, step)`, discarding the result. File lag then delays the outer subworkflow step. When the read succeeds, the inner read in the same iteration sees the file. Test it red-to-green in `test/unit/workflows/test_workflow_progress.py`, beside `test_subworkflow_progress`: a missing `expression.json` with a recent `update_time` should raise `DelayedWorkflowEvaluation`. The `tmp_path` HDA helpers in `test_modules.py` are pytest functions, and this file is a `TestCase`, so they need adapting. Also refresh the stale `InputParameterModule.execute` comment and TODO, comment-only. dev's `subworkflow_progress` loop has the same shape (`run.py:838-848`), so the forward merge is clean.

| Pros | Cons |
|---|---|
| <ul><li>2-3 code lines in an already-touched file (`run.py`), plus a comment-only edit in `modules.py`. No new abstraction.</li><li>Closes the edge for connected and unconnected inner steps alike, at any nesting depth.</li><li>Recorded invocation inputs and parameter workflow outputs still hold the HDA, so this is not the plan's rejected "resolve in `subworkflow_progress`".</li><li>Mapped HDCA values are a no-op, because the helper ignores collections.</li><li>No new failure mode: `recover_mapping` already reads the file on later iterations on this branch.</li><li>Cheap red-to-green unit test.</li></ul> | <ul><li>Reads the file twice per iteration (outer and inner), each a tiny JSON read.</li><li>During lag the whole subworkflow waits, not just the steps that use the label. The wait is bounded by the grace period.</li><li>A "discard the result" call needs a one-line comment saying why.</li></ul> |

<details><summary>Why this rather than the earlier PJA-step delay, or an implicit-dependency check</summary>

- **Earlier head (+14/-18 across `run.py` and `modules.py`).** It resolved inside `effective_replacement_dict(step)` and hoisted the call before job creation in `ToolModule` and `PickValueModule`. The thermo-nuclear review removed it as incidental complexity, and it had a forward-merge ordering constraint against dev's `_capture_workflow_tool_request_state`. Option 2 gets the same guarantee without touching `modules.py`.
- **Implicit-dependency alternative.** Extend `WorkflowInvoker.__check_implicitly_dependent_steps` so that `${name}` references in PJAs (via `get_informal_replacement_parameters`) depend on the same-named `parameter_input` step being scheduled. That is more general, but about 10 lines. It also needs `get_informal_replacement_parameters` hoisted to the `WorkflowModule` base, because `PickValueModule` doesn't implement it. Larger for the same practical effect.
- **Accepting the edge** is defensible: a literal `${label}` is no worse than base's repr. But it is wrong output in the reported shape, and the grace period exists because this lag happens in production.
</details>

### 3. Mapped expression collection (HDCA) into a subworkflow text input

A mapped expression tool feeding a subworkflow text input gives an HDCA. The helper leaves it alone, so `${label}` renders `<HistoryDatasetCollectionAssociation(...)>`. A fix needs a replacement dict per job.

| Pros | Cons |
|---|---|
| <ul><li>Same symptom family as the issue.</li><li>Predates the branch, and a reviewer may ask about it.</li></ul> | <ul><li>`job_callback` gets only `job` (`modules.py:3021`). A per-element value needs `tools/execute.py` to pass the slice or element identity, which is new plumbing outside the touched code.</li><li>Undefined for some shapes: the implicit collection name (`_handle_mapped_over_post_job_actions`) and zero-input steps have no single per-element value.</li><li>Needs a design decision (which element names the HDCA?), so it is not a modest expansion.</li></ul> |

Separate issue. The index.md follow-up already records it.

### 4. Validate expression-backed values in `InputParameterModule.execute`

The inner input step skips `input_param.validate` for HDA-backed values. Its comment says validating would require delaying until the values are ready. That premise no longer holds: the subworkflow step waits, and the value is now read at storage time.

| Pros | Cons |
|---|---|
| <ul><li>Same call chain.</li><li>Closes a long-standing TODO.</li><li>Roughly 3-5 lines.</li></ul> | <ul><li>A behavior change that can newly fail invocations that pass today, such as an inner input with regex, min/max or options validators fed by an expression tool.</li><li>Type coercion questions, for example an int from `pick_value` into a text input.</li><li>Not a bug report, and risky on a release branch.</li></ul> |

Not recommended here. It is a candidate dev PR. The trivial part, rewording the stale comment and the "raise Delayed if not ready" TODO, is folded into scope 2.

### 5. Other places that stringify parameter values that may be expression.json HDAs

I surveyed `lib/galaxy/workflow`, `lib/galaxy/job_execution` and `managers/workflows.py`. The result is negative; the only consumer is the line this branch fixes.

| Site | Finding |
|---|---|
| `post.py` `RenameDatasetAction._gen_new_name` | The only consumer of `replacement_dict` (`${k}`), which is fixed at the source. |
| `post.py` `#{input}` | Uses job input *dataset names*, not parameter values. |
| `TagDatasetAction` / `RemoveTagDatasetAction` | Ignore `replacement_dict`; there is no `${}` support. |
| `run_request.py:710` `str(parameter_value)` | Top-level `input_step_parameters` only, and always primitive. `WorkflowInvocation.add_input` routes an HDA to `input_datasets` (`model/__init__.py:10424`). Subworkflow progress reuses the parent's dict. |
| ToolModule tool params (`modules.py:2933`) | Already use `replace_expression_json_dataset`. |
| `when` / `to_cwl` | Read expression.json themselves (`modules.py:291`). |

| Pros | Cons |
|---|---|
| <ul><li>Confirms the one-line fix is complete for `${}`.</li></ul> | <ul><li>Nothing to expand into.</li></ul> |

Adjacent, and not recommended for this branch: `PickValueModule` lacks `get_informal_replacement_parameters`. So a `${x}` used only in a native `pick_value` rename isn't listed in the step's or the parent subworkflow's `replacement_parameters`, and the run form won't prompt for it. That is a separate small bug in untouched code.

### 6. Older base (release_26.0 / release_25.1)

Both have the bug (`str(output_value)` at `run.py:638` and `run.py:629`) but lack `read_expression_json` and `replace_expression_json_dataset`.

| Pros | Cons |
|---|---|
| <ul><li>Reaches more deployments.</li></ul> | <ul><li>Needs an inline `json.load` without the 26.1 grace-period delay, or a backport of the reader.</li><li>A different patch per branch.</li><li>Low severity: rename cosmetics.</li></ul> |

Keep the recorded decision of `release_26.1`.
