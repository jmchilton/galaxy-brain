# Re-scope debrief

The first hardening round's [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion with three parts:

- **B:** reject an incompatible collection edge when a workflow step is scheduled.
- **C:** check collections supplied to typed workflow collection inputs when the invocation is requested.
- **D:** check sample sheet `column_definitions` in the tool parameter check.

The original scope is kept as `issue_24474_collection_input_type_26.2_alt_original_scope` ([alt](alts/original_scope.md)).

## What landed

- **D** (`ac225f311ab`): `_check_collection_type` rejects a directly matched collection whose sample sheet columns don't match the parameter's declared `column_definitions`. This mirrors the tool form's `_classify_hdca`, so workflow sample sheet inputs (run form) and user-defined tools behave the same at run time as in the dropdown.
- **B, narrowed** (`0ab58d1ebb1`, then `c3f93b1ee0b` and `66e7474a571`): `MapOverPlanner` raises `IncompatibleCollectionInput` when an HDCA reaches a tool step's collection input that neither matches its declared types nor can be mapped over. `WorkflowModule.plan_map_over` turns that into a `workflow_parameter_invalid` invocation failure. Before, such jobs failed at preparation, and before this branch they ran with the wrong structure. The check is skipped for:
  - steps with a `when` expression, or steps inside a conditional mapped subworkflow, because they may be skipped (the re-scope review's HIGH finding);
  - subworkflow steps;
  - mapped subworkflow structure;
  - DCE replacements.
  Job preparation still catches anything that runs.

## What was dropped

- **C** was implemented, then removed. The full `test_workflows.py` suite showed that workflow collection inputs take collections deeper than their declared type: a `list` input receiving a `list:paired` is relied on by `test_mapping_and_subcollection_mapping`, `test_change_datatype_collection_map_over` and `test_workflow_resume_with_mapped_over_collection_input`. Neither `accepts()` nor `can_map_over()` models this "prefix" rule, so a request-time check would reject valid invocations.
- For the same reason, B does not apply to subworkflow steps: they feed workflow input steps.
- Modelling workflow-input semantics correctly is a separate design question, better aimed at `dev`.

## Also found

`lib/galaxy_test/workflow/rename_based_on_input_collection.gxwf-tests.yml` fed a `list` (with forward/reverse identifiers) to `mapper2`'s `paired` input. That test relied on the bug. Its data now supplies a `paired` collection, a fix that applies to the original scope too, so it was also added to the alt branch (`c477693a65b`). Users with real workflows doing the same thing will now get an error. John should weigh that for a release branch.

## Review

[Re-scope review](subagents/review_2_rescope.md): every finding was acted on or superseded by dropping C. Tests added:

- `test_skipped_step_with_incompatible_collection_does_not_fail_invocation`
- `test_untyped_collection_input_incompatible_with_tool_fails_invocation` (replaces the job-prep test)
- `test_typed_collection_input_maps_over_nested_collection`
- unit tests for sample sheet columns, including the no-columns case
