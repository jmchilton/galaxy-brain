# Further standalone extractions — 2026-10-15

John requested all four as independent branches off `release_26.2`. All are now pushed, reviewed and handed off under `branches_implemented_needs_ci`, starting directly at `0c70fdd5182`. The original validation branch remains unchanged at `07377e10531`.

| Slice | Boundary and validation |
| --- | --- |
| Reject invalid preferred object-store IDs | Extract `run_request.py::_validate_object_store_ids`, reusing existing `validate_preferred_object_store_id`. Check all three fields before history creation; retain valid selections and split-store combinations. |
| Reject unknown completion actions | Extract `WorkflowsService._check_on_complete`, registry singleton registration and injection. Cover unknown actions, registered actions and ordinary invocations. Leave target-URI validation out. |
| Reject workflow-incompatible tools before invoking | Extract `WorkflowsService._check_workflow_tools` and `ToolLike.is_workflow_compatible`. Preserve existing missing-tool errors, exact-version selection and runtime checks. |
| Reject disconnected required subworkflow inputs | Extract recursive `run_request.py::_validate_subworkflow_input_connections` and the shared helper in `modules.py`. Cover required, partly connected and nested cases; preserve optional/defaulted inputs and the runtime backstop. Its runtime refactor is optional. |

Each extraction is independently implemented, reviewed and tested; the records below contain the evidence. These guards precede their relevant history/invocation creation paths without the broad input resolver. They do not establish whole-request atomicity.

The old multiple-text validator implementation is already superseded upstream by per-entry validation and normalization in the merged multiple-parameter work. Do not extract it again.

Dataset-versus-collection, collection-type and deleted-input validation could be another coherent slice later, but valid collection mapping currently fails. Reconcile that behavior before extracting it. Keep parameter type/restriction validation and the full validate-before-side-effects restructuring as the central #20900 work for now.

## Branch handoffs

- [invocation_object_store_validation](../invocation_object_store_validation/index.md) — Validate workflow object-store preferences.
- [invocation_completion_action_validation](../invocation_completion_action_validation/index.md) — Reject unknown completion actions.
- [invocation_tool_compatibility](../invocation_tool_compatibility/index.md) — Reject incompatible workflow tools early.
- [invocation_subworkflow_input_connections](../invocation_subworkflow_input_connections/index.md) — Reject disconnected required subworkflow inputs.
