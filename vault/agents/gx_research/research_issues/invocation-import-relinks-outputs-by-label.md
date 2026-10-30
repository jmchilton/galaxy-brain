# Invocation import relinks workflow outputs by label, so unlabeled outputs attach to the wrong WorkflowOutput

- Area: lib/galaxy/model/store/__init__.py (`_import_workflow_invocations`), lib/galaxy/model/__init__.py (`Workflow.workflow_output_for`, `WorkflowInvocation.to_dict`)
- Found while: [[Component - Workflow Invocation Models]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- On export, each invocation-level output association serializes its `workflow_output` as `{output_name, label, uuid}` plus the step's `order_index` (`WorkflowInvocationOutputDatasetAssociation._serialize`, `lib/galaxy/model/__init__.py:11243-11248`; same for collections `:11280-11287` and values `:11320-11325`; `WorkflowOutput._serialize`, `:9854-9860`).
- On import, the step is restored by `order_index` (`attach_workflow_step`, `lib/galaxy/model/store/__init__.py:1183-1185`), but the `WorkflowOutput` is looked up with `workflow.workflow_output_for(label)` across the whole workflow (`:1305`, `:1322`, `:1340`). `Workflow.workflow_output_for` returns the first output whose label equals the argument (`lib/galaxy/model/__init__.py:9275-9281`).
- `WorkflowOutput.label` is nullable, and the element view explicitly handles unlabeled outputs (`:10539-10541`, `:10551-10553`). For an unlabeled output, the import passes `label=None` and gets the first unlabeled `WorkflowOutput` of any step, not the one on the restored step. The imported association then has `workflow_step` pointing at one step and `workflow_output` at another step's output, and the element view's fallback key `"<output_name> (Step N)"` names the wrong step and output.
- If two unlabeled outputs are exported, both rows relink to the same `WorkflowOutput`, so the element view's `outputs` dict collapses them under one key.
- The only invocation round-trip unit fixture uses a labeled output (`test/unit/data/model/test_model_store.py:1614-1615`).

## Evidence / repro

Export (`write_store`) an invocation of a workflow with two tool steps whose outputs are marked as workflow outputs without labels. Import the store into a new history (`POST /api/invocations/from_store`) and compare `outputs` on the original and imported invocation.

## Suggested fix

Resolve the output on the restored step: `step.workflow_output_for(output_name)` (`WorkflowStep.workflow_output_for`, `:9632-9638`), falling back to the label only when the step lookup fails. Add a model-store test with an unlabeled workflow output.

## Related

- `invocation-step-output-value-scalar.md`
