---
type: issue
tags:
  - galaxy/tools/yaml
  - galaxy/tools
  - workflow_state
component: User-Defined Tools
status: draft
created: 2026-04-04
---

# YAML tool parameter schema leaks XML-only metamodel fields

## Summary

`UserToolSource` and `AdminToolSource` (in `lib/galaxy/tool_util_models/__init__.py`) declare
`inputs: List[GalaxyToolParameterModel]`, which is a discriminated union over the **full**
internal Galaxy XML parameter metamodel. As a result the YAML tool authoring surface — and
the published JSON schema driving the Monaco editor — advertises fields and whole parameter
types that XML tools use but that YAML tools either ignore or cannot implement.

This is both a user-facing UX problem (bogus autocomplete, bogus validation passes) and a
commitment problem (shipping a schema we will want to shrink later).

## Evidence

`UserToolSource.inputs` uses `GalaxyToolParameterModel`
(`lib/galaxy/tool_util_models/parameters.py:2372`), a `RootModel` over
`GalaxyParameterT` — the same union used internally for XML-parsed tools. The client
consumes it via `client/src/components/Tool/ToolSourceSchema.json`, regenerated from
`UserToolSource.model_json_schema()` (`client/src/components/Tool/rebuild.py`).

Dumping properties from that published schema:

```
BooleanParameterModel      -> name, parameter_type, hidden, label, help, argument,
                              is_dynamic, optional, type, value, truevalue, falsevalue
HiddenParameterModel       -> ..., value, validators
DataColumnParameterModel   -> ..., multiple, value    # note: no data_ref
GenomeBuildParameterModel  -> ..., multiple
DrillDownParameterModel    -> ..., options, multiple, hierarchy
BaseUrlParameterModel      -> (only base fields)
GroupTagParameterModel     -> ..., multiple
RulesParameterModel        -> (only base fields)
DirectoryUriParameterModel -> ..., validators
```

### Nonsensical field leaks on otherwise-supported types

- `BooleanParameterModel.truevalue` / `falsevalue`
  (`lib/galaxy/tool_util_models/parameters.py:1498-1499`) — Cheetah command-substitution
  tokens. YAML tools use sandboxed JS (`$(inputs.foo)`) inside `shell_command` /
  `arguments`; there is no substitution layer that consults these fields.
- `argument` (`BaseGalaxyToolParameterModelDefinition`, line 226) — XML convention for
  auto-deriving `name` from a CLI flag. YAML tools always require explicit `name`.
- `is_dynamic` — XML parser internal flag, not user-authorable.
- `parameter_type` — the `gx_*` discriminator duplicates `type` and is internal taxonomy.
- `hidden` (on a parameter) — an XML form affordance; undefined for the YAML runner.

### Whole parameter types that don't work from YAML

- `HiddenParameterModel` — XML-only concept.
- `DataColumnParameterModel` — XML version requires `data_ref`; the model here omits it
  (`parameters.py:1846`), so it cannot wire to a dataset even if declared.
- `GenomeBuildParameterModel`, `GroupTagParameterModel` — rely on XML-side metadata
  plumbing and data_ref semantics absent from the YAML pipeline.
- `BaseUrlParameterModel` — injects Galaxy base URL into Cheetah templates; no hook for
  the JS runtime.
- `RulesParameterModel`, `DrillDownParameterModel` — no support in `runtimeify`
  (`lib/galaxy/tool_util/parameters/convert.py`); no obvious mapping to the JS inputs
  model either.
- `DirectoryUriParameterModel` — possibly valid for YAML later, but no current runtime
  support.

### Validators carried along wholesale

`TextCompatiableValidators` (Length / Regex / **Expression** / EmptyField) and
`SelectCompatiableValidators` (NoOptions) are reused from the XML world. Length / Regex /
NoOptions / EmptyField are fine. `ExpressionParameterValidatorModel` is a Cheetah-style
expression validator and does not belong in a sandboxed-YAML world.

### Partial prior narrowing

Some XML attributes *are* already absent from these models — e.g. `display` on select,
`data_ref` on data_column, `dynamic_options`, `code_file`, `refresh_on_change`,
`sanitizer`. So the intent to narrow exists; it just hasn't been completed, and it's
been done by omission rather than by an explicit narrower base class.

## Why it matters

1. **API surface commitment.** The PR 19434 TODO explicitly plans to publish the
   `UserToolSource` schema. Every dead field becomes a thing users will try to set, file
   bugs about, and that is painful to remove later.
2. **Editor UX.** Monaco autocompletes `truevalue`, `hidden`, `argument`, `is_dynamic`,
   and whole parameter types that cannot work, implying they mean something.
3. **Runtime divergence.** `runtimeify` only implements `DataParameterModel` adaptation.
   Several parameter types in the advertised union fall through unchanged or raise
   `NotImplementedError`. The type system promises support the runtime doesn't deliver.
4. **Maintenance drag.** Every new XML metamodel field silently leaks into user-defined
   tools.

## Scope of affected sources

- `UserToolSource` (`GalaxyUserTool` class) — the user-facing YAML tool source.
- `AdminToolSource` (`GalaxyTool` class) — admin dynamic YAML tools. Same authoring
  audience modulo permissions, same runtime path (sandboxed JS, JS `$(inputs.foo)` in
  `command:` instead of `shell_command:`). Should be tightened together.

## What this issue does **not** touch

- The internal metamodel (`GalaxyParameterT`, `ToolParameterT`) used by XML tools,
  state transformations, `runtimeify`, and `input_models_for_tool_source`. That
  remains the single source of truth for execution, state validation, and workflow
  step handling. The fix is an *authoring/publication* narrowing, with an explicit
  mapping into the internal metamodel.
- The `/api/unprivileged_tools/runtime_model` endpoint's output shape (the JS inputs
  intellisense schema). That endpoint already uses the internal metamodel via
  `input_models_for_tool_source` → `create_job_runtime_model`, and the `job_runtime`
  representation does not leak XML-only fields for the supported parameter types.
  Narrowing `UserToolSource.inputs` incidentally enforces that only safe types reach
  that pipeline.

## Goal

Introduce an explicit, narrower YAML-facing parameter model used by `UserToolSource`
and `AdminToolSource`, with a one-way mapping into the existing internal metamodel so
no downstream code changes shape. The published `ToolSourceSchema.json` shrinks
accordingly, and `extra="forbid"` on the new models prevents future accidental leaks.
