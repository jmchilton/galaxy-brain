# Rescope debrief

The scope evaluation recommended a modest expansion: close the accepted shared-filesystem-lag edge. I kept the original as `issue_24188_subworkflow_rename_expression_json_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

Added on the working branch:
- `c347d5da7fb`: `subworkflow_progress` pre-reads expression.json for each `parameter_input` subworkflow input (`replace_expression_json_dataset`, result discarded). A lagging file now delays the outer subworkflow step before any inner step can rename with a literal `${label}`. Two unit tests in `test_workflow_progress.py`; the delay test went red to green.
- `248ffbab979`: rescope-review cleanups. Shared the `expression_json_hda` helper in `workflow_support.py`, strengthened the delay assertion, and clarified the comment.

Not taken from the scope evaluation: the mapped-HDCA per-job dict (new plumbing, separate issue), validating expression-backed values (behavior change), the TODO comment refresh, and an older base.

Tests: unit 123 passed. Subworkflow/replacement/pick_value framework tests: 17 passed. Subworkflow/expression API tests: 53 passed.
