# Thermo-nuclear review

I acted on one finding, the main one. The fix now resolves the `expression.json` value when it is stored in `set_outputs_for_input`, not each time the replacement dict is built. The whole fix is now one line in `run.py`:

```python
self.runtime_replacements[step.label] = str(modules.replace_expression_json_dataset(output_value, step))
```

This reverts all of the branch's `modules.py` changes: the two hoisted `effective_replacement_dict(step)` calls, the "may delay" comments, and the callback and `_handle_mapped_over_post_job_actions` edits. It also restores `effective_replacement_dict()` to no arguments and its original body, drops the docstring, and returns `runtime_replacements` to `dict[str, str]`. The source delta against base went from 2 files, +14/-18, to 1 file, +1/-1. Left uncommitted in the worktree.

Not acted on:
- The duplicated `pick_text` step and `outer_text` data in the two new API tests. Inline YAML per test is the file's convention, and a shared fragment would be a one-off.
- The repeated `output_collections` → `get_history_collection_details` lookup. Already declined in test_challenges_debrief.md (about 25 existing sites).
- File size. `modules.py` now has no delta. `run.py` is 841 lines. `test_workflows.py` was already far past 1k before this branch.

## Why storage time is safe now

The plan rejected storage-time resolution for one reason: the input step might run before the expression dataset existed. The plan's correction note disproved that. I re-checked it in code:

- `SubWorkflowModule.execute` always calls `compute_collection_info` → `_find_collections_to_match` → `progress.replacement_for_input` for every subworkflow input, before `subworkflow_invoker` runs the inner steps. This holds on the plain, mapped and `when` paths.
- `replacement_for_input` sets `is_data` from `input_type in ["dataset", "dataset_collection"]`. A subworkflow parameter input has input type `parameter`, so `replacement_for_connection(is_data=False)` delays on a pending HDA and fails on one that is not ok.

So by the time the inner `InputParameterModule.execute` runs, the dataset is ok. The hoisting into `ToolModule.execute` and `PickValueModule.execute` only existed so a read could delay before jobs were created. Once the read happens at the input step, it isn't needed.

This is not the plan's other rejected alternative, which resolved values in `subworkflow_progress`. Only the `${}` map changes here. Recorded invocation inputs and parameter-input workflow outputs still hold the HDA. Codex finding 1 is unaffected: every labeled parameter input is still resolved, with no referenced-name filter.

## Behavior differences vs the previous branch head

- **Attribution.** A missing or unreadable `expression.json` now delays or fails the inner input step, not the downstream tool or `pick_value` step. That is the step that actually holds the value.
- **Reads.** The file is read once per labeled input per scheduling iteration (execute, or `recover_mapping` on later iterations). Before, it was read on every tool or `pick_value` step execution.
- **Recovery.** `_recover_mapping` catches only Delay. A Fail during recovery (for example, the dataset was purged mid-invocation) propagates to `queue_invoke`, which fails the invocation. The previous head failed the same way, just from a tool step.
- **Forward merge.** There is no longer an ordering constraint against dev's `_capture_workflow_tool_request_state`, because `modules.py` is untouched. I updated the index.md decision bullet.

## Validation

All run one at a time, with no test changes:
- unit `test/unit/workflows`: 121 passed, 1 skipped
- framework `-k "replacement_parameters or pick_value"`: 15 passed, including `replacement_parameters_nested_expression` with the native `pick_value` `out3` case
- API `-k "expression_replacement_parameter or test_run_subworkflow_replacement_parameters or runtime_pja"`: 5 passed (both new expression tests, the mapped one included, plus the subworkflow replacement and runtime PJA tests)
- `black` and `isort` clean. `mypy galaxy/workflow/{run,modules}.py` reports no errors in `galaxy/workflow/`.

I did not repeat the red check. The tests are unchanged and were red on base (test_challenges_debrief.md), and the new delta is the same storage line with the resolver added.

<details><summary>Review</summary>

1. **Missed code-judo (high).** The branch resolved `expression.json` values late, in `effective_replacement_dict(step)`. That forced three more changes: (a) a new `step` parameter, (b) hoisting the call out of the job callback in `ToolModule.execute` and to the top of `PickValueModule.execute`, because a delay inside `job_callback` would leave jobs half-created, and (c) a docstring explaining (b), plus a forward-merge ordering rule for dev. All of that is incidental complexity. It came from the plan's readiness concern, which the correction note had already invalidated. Resolving where the value is stored deletes it all.
2. **Type churn (medium, folded into 1).** `runtime_replacements: dict[str, Any]` widened a clean `dict[str, str]` only to defer `str()`. It goes away with 1.
3. **Docstring and comment length (low, folded into 1).** A five-line docstring and two "may delay the step" comments existed only to explain the hoist.
4. **Tests (nit).** The two API tests duplicate the `pick_text` step and `outer_text` data. That matches the file's convention of inline YAML per test, so I left it.
5. **File size.** No threshold crossed. modules.py ends with zero delta.

Checked fine: imports at top (`modules` is already imported in run.py); `replace_expression_json_dataset` is the canonical helper, already used by `replacement_for_connection` consumers; primitives, NO_REPLACEMENT and non-expression values behave as on base; DCE values are handled by the helper. No security concerns.
</details>
