# Alt: original scope

Branch `issue_24188_subworkflow_rename_expression_json_alt_original_scope` (`87867681d6e`, pushed to `jmchilton`).

This is the fix before re-scope: one line in `WorkflowProgress.set_outputs_for_input` stores the resolved `expression.json` value, plus the framework workflow test and two API tests. It differs from the parent in two ways.
- No pre-read in `subworkflow_progress`. When shared-filesystem lag hides the file, only the inner input step is delayed, so an unconnected inner step (e.g. `__BUILD_LIST__`) can rename with a literal `${label}`.
- No unit tests in `test/unit/workflows/test_workflow_progress.py`.
