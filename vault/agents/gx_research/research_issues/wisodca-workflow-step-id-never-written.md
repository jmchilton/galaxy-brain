# `workflow_invocation_step_output_dataset_collection_association.workflow_step_id` is indexed but never written

- Area: lib/galaxy/model/__init__.py (`WorkflowInvocationStepOutputDatasetCollectionAssociation`)
- Found while: [[Component - Workflow Invocation Models]]
- Galaxy SHA: 65e6daff
- Severity: low (dead column)

## Problem

- The step-level collection output association declares an indexed `workflow_step_id` FK (`fk_wisodca_wsi`, `lib/galaxy/model/__init__.py:11356-11358`). Its dataset sibling has no such column (`:11328-11344`).
- The only constructors are `WorkflowInvocationStep.add_output` (`:10904-10920`) and the model-store import (`lib/galaxy/model/store/__init__.py:1225-1237`). Neither sets `workflow_step_id`, and the class has no relationship or `__init__` that would. A repository-wide search finds no other writer, so the column is always `NULL`.
- A reader that filters this table by `workflow_step_id`, expecting it to match `workflow_invocation_step.workflow_step_id`, gets no rows. The only working path to the step is `workflow_invocation_step_id`.

## Suggested fix

Either populate it in `add_output` and the import (`output_assoc.workflow_step_id = self.workflow_step_id`), or drop the column and its index in a migration. Dropping is simpler, since every reader already goes through `workflow_invocation_step_id`.
