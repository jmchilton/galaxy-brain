# `WorkflowInvocationStep.output_value` is scalar, but a subworkflow step can record several output values

- Area: lib/galaxy/model/__init__.py (`WorkflowInvocationStep.output_value`, `WorkflowInvocationOutputValue`), lib/galaxy/workflow/run.py (`WorkflowProgress.set_step_outputs`)
- Found while: [[Component - Workflow Invocation Models]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- `WorkflowInvocationStep.output_value` is a view-only relationship joined on `(workflow_invocation_id, workflow_step_id)` with the step's columns as `foreign_keys` (`lib/galaxy/model/__init__.py:10853-10864`). That makes it many-to-one, so it loads one `WorkflowInvocationOutputValue`.
- Nothing limits `workflow_invocation_output_value` to one row per step. A subworkflow step with two parameter outputs, both marked as parent workflow outputs, records two rows: `test_subworkflow_import_order_maintained` asserts `output_values["out_1"] == 1` and `output_values["out_2"] == 2` for one subworkflow step (`lib/galaxy_test/api/test_workflows.py:11065-11125`).
- `WorkflowProgress.set_step_outputs` restores value outputs on recovery from that scalar only (`lib/galaxy/workflow/run.py:722-723`). `WorkflowModule.recover_mapping` restores only dataset and collection outputs (`lib/galaxy/workflow/modules.py:788-800`). A scheduled subworkflow step recovered on a later scheduling pass therefore gets back at most one of its value outputs.
- Value outputs that the parent does not mark as workflow outputs are never persisted: `set_step_outputs` writes step-level rows only for objects with `history_content_type` (`run.py:726-728`), and invocation-level rows only for the step's `workflow_outputs` (`:729-747`).

## Evidence / repro

Code reading; not reproduced. A candidate: a parent workflow whose subworkflow step exposes two integer outputs, both consumed by a downstream step that is delayed (for example, waiting on a running job) so that the subworkflow step is recovered via `_recover_mapping` on the next pass.

## Suggested fix

Make the relationship a list (`uselist=True`, or a plain one-to-many keyed on the same pair) and restore every value keyed by its `workflow_output.output_name`. Consider persisting value outputs at step level so that recovery does not depend on the parent marking them as workflow outputs.

## Related

- `invocation-import-relinks-outputs-by-label.md`
