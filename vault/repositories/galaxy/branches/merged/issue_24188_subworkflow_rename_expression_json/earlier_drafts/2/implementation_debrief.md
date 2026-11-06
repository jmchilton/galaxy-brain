# Implementation debrief

**STATUS: READY.** Base `release_26.1`, head `5ce3acf579c`, 3 commits, pushed to `jmchilton`.

The fix:
- `WorkflowProgress.set_outputs_for_input` stores `str(replace_expression_json_dataset(value, step))`, not `str(value)`. So `${label}` in subworkflow PJAs gets the expression.json value, not the HDA repr. This covers tool, mapped-over, `__BUILD_LIST__` and native `pick_value` steps.
- `subworkflow_progress` pre-reads expression.json for `parameter_input` subworkflow inputs. A file hidden by shared-filesystem lag then delays the whole subworkflow step, so an unconnected inner step can't rename with a literal `${label}`. This came from the first scope evaluation; the alt branch `_alt_original_scope` keeps the version without it.
- The `expression_json_hda` test helper was moved to `workflow_support.py` as a baseline refactor commit.

Key choices:
- The first plan assumed a missing scheduling dependency and built extra plumbing for it. Tests showed `SubWorkflowModule` already waits for (and fails on) its parameter datasets, via `_find_collections_to_match`. Reviews then cut the fix to one line: the issue reporter's own suggestion was right.
- All runtime replacements are kept, not only names the PJAs reference. Filtering broke the second-order `${}` after `#{input}` expansion (Codex).
- Base 26.1: older branches lack the expression.json reader.

Accepted tradeoff: re-reading on each scheduling pass can fail an invocation if the expression dataset is manually purged while its subworkflow is still scheduling. `DeleteIntermediatesAction` skips active invocations and only deletes.

Tests:
- framework workflow `replacement_parameters_nested_expression` (tool + native pick_value renames)
- API: mapped-over subworkflow (implicit collection and element names), and the issue's exact `__BUILD_LIST__` repro
- 2 unit tests (resolved replacement; lag delays the subworkflow)

All are red on base with the HDA repr. The delay test is also red on the alt. Last runs: unit 123, subworkflow framework 17, subworkflow/expression API 53, all passing.

Scope evaluation (fresh): keep as implemented.

Follow-ups (index.md):
- a mapped expression HDCA into a subworkflow text param still renders as a repr (needs a per-job replacement dict)
- `PickValueModule` lacks `get_informal_replacement_parameters`, as a separate small 26.1 PR

Forward merge to dev: only a trivial import conflict in `test_workflow_progress.py`.
