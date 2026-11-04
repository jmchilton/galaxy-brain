# Component - Workflow Serialization - Editor Dict, Export and Step Fields

Document the outbound and per-step half of `WorkflowContentsManager` in `lib/galaxy/managers/workflows.py`, which the vault covers only for import: `workflow_to_dict` and its style dispatch (`editor`, `export`, `instance`, `format2`/`to_format_2`), `_workflow_to_dict_editor` (what each step dict carries, what is added only for the editor such as module config forms and tooltips), `_workflow_to_dict_export` (the `.ga` step dict, `allow_upgrade`, `internal`, which fields are conditionally emitted), and the matching read side in `__module_from_dict` / `_workflow_from_raw_description` / `update_workflow_from_raw_description` (which step-dict keys are applied to a `WorkflowStep`, which are silently ignored). Cover the per-version `WorkflowStep` rows and what `WorkflowStep.copy_to` copies, how step-level metadata that has no dedicated column is stored (the JSON `WorkflowStep.config`, `when_expression`, `position`, `tool_inputs`), what the refactor executor round-trips (export to dict, mutate, re-import) and which gxformat2 converter paths (`python_to_workflow`, `from_galaxy_native`) preserve or drop an unknown step key. Include a checklist of every place a new step field must be added (model, editor dict, export dict, import, copy, refactor, gxformat2, API schema, tests such as `test_export_editor` and the round-trip API tests) and how fields are validated (or not) on import and on update.

Leave out tool state encoding (see [[Component - Workflow Format (.ga)]]), the HTTP import controller stack (see [[Component - Workflow Import]]) and the module state round trip (see the pending `workflow_modules_editor_state_roundtrip` request).

## Why

Stage 3 of the invocation graph embedded outputs work stores a per-step `preferred_output` in `WorkflowStep.config` and had to rediscover each serialization site, its gxformat2 behavior and the absence of validation by reading code. `Component - Workflow Format (.ga)` documents only the persisted shape, `Component - Workflow Import` only the inbound path, and `Component - Workflow Refactoring API` only the refactor entry point.

## Requested by

- vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/brain_research.md: needed every step-field serialization site (editor dict, `.ga` export, import, copy), gxformat2 round-trip behavior and import-time validation for a new `WorkflowStep.config` field.
