# `when` expressions: compile against a tool schema?

Question from mvdbeek on #23816 (`whenExpression.ts:4`, 2026-09-30): instead of static analysis, compile `when` expressions against the tool input schema, as the custom tool editor does. Can we do that and keep the declarative tests (`when_expression_spec.yml`)? Does the workflow editor always have what it needs?

His broader ask is to cut scope ("these aren't written by hand… can we simply fail these", "start with simple boolean input"). Compile-vs-tokenize is only part of it.

Refs: Galaxy `origin/dev` @ `d12f9039128`; #23816 head `849daf6fc92`; downstream uses on `optional_input_gating`. A subagent fact-checked this doc on 2026-09-30, and its corrections are folded in.

## Short answer

- **The declarative tests survive any implementation.** They assert what an expression *reads* (`static_paths`, `dynamic`, `references_input`), not how that's computed.
- **Type checking against a schema can't stand in for extraction.** Monaco's worker returns diagnostics, not the set of paths read. That set is what the editor terminal logic, `optional_input_gating`'s presence gates, and #23817's import check need.
  - The TS compiler API (`createSourceFile`, which is synchronous, plus a checker) *could* do extraction by walking the syntax tree. That makes it a parser swap, not a schema feature.
- **Strict type checking would reject expressions that work today.**
  - Conditionals would be typed as discriminated unions, so `inputs.cond.input1` fails unless the expression first narrows on the test param.
  - Optional data forces null checks.
- **The analysis logic is duplicated.** #23817 ports the analyzer to Python (`galaxy.workflow.when_expression`), and both sides run the same spec. Any schema layer we add would be duplicated too.
- **The editor never authors a free-form `when`.**
  - On dev, `FormConditional.vue` writes only `$(inputs.when)`; its free-text field is commented out.
  - On `optional_input_gating`, it writes only generated gates (`BOOLEAN_GATE_EXPRESSION`, `presenceGateExpression(name)`).
  - Hand-written expressions arrive only via import or the API, which means only via the server. See option D.

## How the custom tool editor does it

- **Monaco setup.** `client/src/components/Tool/YamlJs.ts` configures Monaco TypeScript with `strict` and `checkJs`. A `declare global { const inputs: components["schemas"]["inputs"] }` fragment goes into a separate TypeScript model, created inside a function named `addExtraLibs` (it does not actually call `addExtraLib`).
- **Schema fetch.** `client/src/components/Tool/runTimeModel.ts` POSTs the YAML representation to `/api/unprivileged_tools/runtime_model` and converts the result with `schema-to-ts`. The call is async.
- **Server side.** `dynamic_tools.py` `runtime_model` calls `ensure_beta_tool_formats_enabled` and `ensure_can_use_unprivileged_tool`. It then runs `YamlToolSource` → `input_models_for_tool_source` → `cwl_runtime_model` (`tool_util/parameters/convert.py:95`, which wraps `create_job_runtime_model`).

## Problems with reusing it for workflow `when`

### 1. Missing tools have no schema

`ToolModule.get_config_form` (`modules.py:2883`) is guarded by `if self.tool:`. It returns `None` when a tool isn't installed, and those steps carry an "is not installed" error. `linting.ts` already skips steps that have `errors`. `step.tool_state` is still present for these steps.

`exact_tools=False` is **not** a problem. `ToolModule.from_workflow_step` forces it (`modules.py:2675`), and the scheduler loads steps the same way. The editor therefore sees the same substituted tool that a run would use, with its state upgraded by `check_and_update_state`.

### 2. The endpoint only covers user tools

`/api/unprivileged_tools/runtime_model` accepts only a YAML representation, and it is permission-gated. Installed tools have `/api/tools/{tool_id}/parameter_request_schema`, plus landing and test-case variants (`api/tools.py:383`, 402, 420). Those describe *request* state.

A new endpoint would be small: `json_schema_response_for_tool_state_model` already takes a state class.

### 3. Some tools can't be modelled

This only affects the `tool_util.parameters` route.

- `input_models_for_page` raises `UnmodelableToolInputs` for `upload_dataset` and for conditionals with `value_from`, and `UnknownParameterTypeError` for unknown types.
- Tool load catches every exception and leaves `tool.parameters = None` (`tools/__init__.py:1688–1695`).
- `config_form`, `tool.inputs` and `tool_state` still exist for these tools, so options A and D don't need a fallback for this. They need one only for missing tools (§1).

### 4. No existing model matches what `when` sees at runtime

`evaluate_value_from_expressions` (`modules.py:406`) builds `inputs` as `to_cwl(...)` (`modules.py:310`) over two sources:

- `execution_state.inputs`: the legacy nested tool state;
- `extra_step_state`: connections that exist only for the `when` check, such as the `when` boolean.

Two cases change which sources appear:

- Nested connections with `|` names are skipped from `extra_step_state` (around `modules.py:3178`).
- Subworkflow steps pass `execution_state={}`, so their `inputs` holds only connections.

The closest existing representation is `job_runtime` (behind `cwl_runtime_model`). It is structurally different, not merely a different contract:

| | `to_cwl` (what `when` sees) | `job_runtime` model |
|---|---|---|
| Collections | bare array (list) or identifier-keyed dict (others): `inputs.c[0]` | `{class: "Collection", collection_type, elements, …}`: `inputs.c.elements[0]` |
| Files | `class`, `location`, `format`, `path`, `basename`, `nameroot`, `nameext` | requires `size`; adds `checksum` and `element_identifier` |
| Conditionals | test param plus `__current_case__` | test param as discriminator; no `__current_case__` |
| Repeats | items carry `__index__` | not declared |
| Missing or runtime values | `None` | required |

`workflow_step`, `workflow_step_linked` and `JobRuntimeToolState` don't match either. A correct schema would be a **new `StateRepresentationT`** in `tool_util_models/parameters.py`, built via `pydantic_template` and `create_model_factory`. Every installed tool gets `tool.parameters` at load (`tools/__init__.py:1688`), so the server side has the raw material.

### 5. Running it in the client

- `typescript` is only a devDependency. However, `monaco-editor` is a runtime dependency, and its lazily loaded TypeScript worker bundles the language service. So the cost isn't a new dependency; it's loading Monaco and its worker into the workflow editor.
- That worker is asynchronous, while `findStepExtraInputs` (`workflowStepStore.ts:551`) and the terminal gating (`terminals.ts:261–308`) are synchronous.

### 6. The server can't reuse a client compiler

#23817 validates in Python, in `__module_from_dict`, with `module.tool` available. There is no TypeScript there, so extraction needs the Python port or a JS parser that Galaxy doesn't depend on.

### 7. Subworkflow steps have no tool schema

Their `when` reads subworkflow input labels, and a label containing `|` is a legitimate name (see #23428). #23817 only checks `step.type == "tool"`, and this doc offers nothing for subworkflows beyond that.

## Can the editor build a path tree synchronously? Yes, with caveats

`config_form` (from `populate_model.py` and `grouping.py`) carries:

- conditionals: `test_param.name`, plus `cases[]` each with `value` and `inputs`, all populated;
- repeats: `name`, a template `inputs`, and per-instance `cache`;
- sections: `name` and `inputs`;
- leaves: `name`, `type`, `optional`, `multiple` and collection types.

The step store already holds `config_form?`. Existing walkers should be reused rather than adding another:

- `client/src/components/Form/utilities.js` has `visitInputs` (active case) and `visitAllInputs` (all cases), which handle Galaxy's `|`/`_i` naming. `findInputByDottedName` is built on them.
- #23816's `resolveConnectionNameToInputPath` walks `step.tool_state`. That is the legacy shape `to_cwl` consumes, and it survives missing tools.

Caveats:

- A tree built over all cases accepts paths into inactive branches, which are undefined at runtime.
- `config_form` refreshes only after server round trips.
- `config_form` is absent for missing tools.

## Options

- **A. Add a schema-validation layer to both analyzers.**
  - The client builds the path tree from `config_form` or `tool_state` using the existing walkers; the server builds it from `tool.inputs` in #23817.
  - #23817 would then reject any unknown static path, which covers the pipe spelling without a special case.
  - Missing tools keep today's permissive behaviour.
  - Add schema cases to the spec.
  - Cost: both the extraction and the tree are implemented twice.
- **B. Replace the client tokenizer with a real parser** (acorn, or `ts.createSourceFile`). This shrinks the hand-written client code, but Python keeps its port (so the two can drift) or adds a parser dependency.
- **C. Monaco type checking as a lint** in a future `when` editor. This needs the new runtime representation (§4) to avoid false errors. Nice to have; it doesn't replace anything.
- **D. The server owns the analysis; the client does no parsing.**
  - The server analyses `when` at import and in `_workflow_to_dict_editor`. It returns per-step results (for example `when_references: {static_paths, dynamic}`) and rejects bad paths at import (#23817, optionally schema-checked against `tool.inputs`).
  - The client already knows the paths for the gates it generates, and uses the server's result for anything else. That result stays valid while editing, because the editor can't change a hand-written `when`.
  - The client keeps only connection-name → path mapping (`workflowInputPath.ts`). The spec drives only the Python tests; the client tests only cover generated gates.
  - One implementation, which goes most of the way to answering Marius's complexity objection.
  - Cost: #23816 gets rebuilt as a server change plus a small client consumer, and the editor payload gains a field. If someone later adds a free-text `when` editor, it would need a re-analysis round trip.
- **E. Cut scope (Marius's ask).** Support only generated gate expressions in the editor. Treat any other `when` as dynamic, which keeps its terminals, and leave rejection to #23817. The client substring bug fix then shrinks to exact name matching for the generated forms.

## Unresolved

- Do we pick D or E, or combine them (E in the editor, with D's server analysis only for import validation)?
- Should an unknown path be an import error in #23817 or only a warning?
- Is a new `when` `StateRepresentationT` worth building now, or only if C happens?
- Should subworkflow `when` validation check against subworkflow input labels?
