# Further split candidates — 2026-10-15

Four additional independent slices make sense, in increasing complexity. These are recommendations; no further branches have been created. Start with the first two.

| Slice | Boundary and validation |
| --- | --- |
| Reject invalid preferred object-store IDs | Extract `run_request.py::_validate_object_store_ids`, reusing existing `validate_preferred_object_store_id`. Check all three fields before history creation; retain valid selections and split-store combinations. |
| Reject unknown completion actions | Extract `WorkflowsService._check_on_complete`, registry singleton registration and injection. Cover unknown actions, registered actions and ordinary invocations. Leave target-URI validation out. |
| Reject workflow-incompatible tools before invoking | Extract `WorkflowsService._check_workflow_tools` and `ToolLike.is_workflow_compatible`. Preserve existing missing-tool errors, exact-version selection and runtime checks. |
| Reject disconnected required subworkflow inputs | Extract recursive `run_request.py::_validate_subworkflow_input_connections` and the shared helper in `modules.py`. Cover required, partly connected and nested cases; preserve optional/defaulted inputs and the runtime backstop. Its runtime refactor is optional. |

These behaviors were already described separately in the source debrief. Their packaging as independent branches is an assessment from this review, not a claim they are already implemented or reviewed separately. Each guard can precede run-config construction without the broad input resolver; none promises whole-request atomicity.

The old multiple-text validator implementation is already superseded upstream by per-entry validation and normalization in the merged multiple-parameter work. Do not extract it again.

Dataset-versus-collection, collection-type and deleted-input validation could be another coherent slice later, but valid collection mapping currently fails. Reconcile that behavior before extracting it. Keep parameter type/restriction validation and the full validate-before-side-effects restructuring as the central #20900 work for now.
