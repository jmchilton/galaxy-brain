# Component - Workflow Modules and Editor State Round Trip

Document `lib/galaxy/workflow/modules.py` as the layer between persisted step state and the workflow editor's tool-form state, with `InputParameterModule` as the worked example.

Cover:

- **Module lifecycle.** `WorkflowModule.from_dict` / `recover_state` (the `from_tool_form` kwarg and `step_state_to_tool_state`), `get_config_form` / `get_inputs`, `_parse_state_into_dict`, `save_to_step`, and `get_export_state`. Name which direction each hook converts and which callers use it (editor load, editor save/`/api/workflows/build_module`, import, export, refactor API).
- **Form state vs. persisted state.** How the typed persisted dict (`restrictions`, `suggestions`, `validators`, `default`, `optional`) becomes the nested form dict (`parameter_definition` with conditionals such as `restrictions.how`) and back. List every field that is re-encoded as a string for the form (`format` comma lists, `value:label,...` restriction strings) and which of those conversions are lossy.
- **Client side.** Which Vue form components render these fields (`FormTool.vue`, `FormDefault.vue`, conditional and repeat handling in the workflow editor `Forms/` directory) and what a repeat/structured field would need.
- **Tests.** Where the conversion is covered (`test/unit/workflows/`, API workflow tests, framework tests) and where it is not.

Leave out workflow invocation and runtime input handling (`get_runtime_inputs`), which `Component - Workflow Invocation Models` and the run-form notes cover.

## Why

The #24375 branch changes the string encoding in `InputParameterModule.step_state_to_tool_state` and `_parse_state_into_dict`, and no note covers the module layer or the persisted-to-form conversion. `Component - Workflow Format (.ga)` documents only the persisted shape.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24375_restriction_string_roundtrip_26.1/brain_research.md: needed the persisted-to-editor-form conversion path for workflow input parameter restrictions.
