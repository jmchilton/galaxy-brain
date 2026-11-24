# Component - Workflow Extra Step Inputs

Document workflow step inputs that are not tool parameters, end to end:
- **Model:** `WorkflowStepInput` rows that have no matching tool parameter, their connections and `default_value`, and how gxformat2 `in:` entries become such inputs.
- **Editor:** `workflowStepStore` derives `stepExtraInputs` through `findStepExtraInputs`, which covers `when` gate ports (`findGatePorts`) and `$(inputs.name)` rename reference ports (`renameReferencePort`, `rename_reference`). Cover `getCombinedStepInputs`, `InputRenameReferenceTerminal` and `validInputTerminals`, and what happens to connections when the source expression or rename text changes (they linger as invalid).
- **Scheduler:** in `ToolModule.execute`, cover `extra_step_state` for `when` evaluation, `_referenced_step_input_values` for rename references (precedence: tool input, then connection, then default; when it waits; why data inputs don't), `MapOverPlanner`'s handling of extra inputs, and the transient `step_input_values` PJA argument.

Leave out CWL expression evaluation internals (see [[Component - Galaxy Workflow Expression Context]]), terminal compatibility rules in general (see [[Component - Workflow Editor Terminals]]) and PJA classes in general (see [[Component - Post Job Actions]]).

## Why

PR #25002 makes "extra step inputs" a shared mechanism with two producers, `when` expressions and rename references. Each nearby note covers one slice: the expression note covers `extra_step_state`, and the terminals note doesn't mention derived ports. No note says how editor-derived ports, stored step inputs and scheduler resolution fit together.

## Requested by

- vault/repositories/galaxy/reviews/active/25002/: how non-tool step inputs are derived, stored and resolved for `$(inputs.name)` renames in PR #25002
