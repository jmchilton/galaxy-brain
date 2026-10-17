# Initial implementation debrief

`WorkflowProgress.runtime_replacements` now holds raw values. `effective_replacement_dict(step, replacement_parameters)` resolves only the `${...}` names that the step's post job actions reference, reading `expression.json` values through the existing `replace_expression_json_dataset`. `ToolModule` and `PickValueModule` resolve once, before creating jobs or outputs, because `read_expression_json` can raise a filesystem-lag delay. The same dict feeds per-job and mapped-over PJAs. The new module-level `post_job_action_replacement_parameters` is also reused by `ToolModule.get_informal_replacement_parameters`.

Correction to the plan: no new scheduling dependency is needed. `SubWorkflowModule` already waits for (and fails on) datasets feeding its parameter inputs.

Tests (red on base with the exact `<galaxy.model.HistoryDatasetAssociation(...)>` repr, green after):
- framework workflow `replacement_parameters_nested_expression`: tool PJAs and a native `pick_value` rename inside a subworkflow fed by the pick_value tool.
- API `test_run_mapped_subworkflow_expression_replacement_parameter`: mapped-over subworkflow; asserts the implicit collection name (`_handle_mapped_over_post_job_actions`) and the element name.

Also passing: the replacement_parameters/pick_value framework tests (15), related rename/PJA API tests (8), and `test/unit/workflows`.
