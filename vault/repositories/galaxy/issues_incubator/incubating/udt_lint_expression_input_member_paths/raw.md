# User-defined tool lint should reject `inputs.*` member paths that don't exist in the input's runtime model

A `GalaxyUserTool` whose `shell_command` / configfile reads a field the input doesn't have (e.g. `inputs.reads.forward.path` on a `paired_or_unpaired` collection) is accepted at create time. Every job then fails at command build with a JS TypeError, or silently evaluates `undefined`. Galaxy owns both the runtime model and the create-time lint, so it is the natural place to catch this. Companion offline check: jmchilton/galaxy-tool-util-ts#212.

## Motivating case

From a Foundry ncbi/egapx → Galaxy conversion. The `star_wnode` UDT has a `data_collection` input `reads` with `collection_type: paired_or_unpaired`. Its configfile:

```
set -- $(inputs.reads.unpaired ? `'${inputs.reads.unpaired.path}'` : `'${inputs.reads.forward.path}' '${inputs.reads.reverse.path}'`)
```

`inputs.reads.unpaired` is always undefined, so the code always takes the paired branch. `inputs.reads.forward` is undefined, so the paired branch throws. The correct form is `has_single_item ? elements.unpaired.path : elements.forward.path / elements.reverse.path`; `test/functional/tools/collection_paired_test_y.yml` uses `inputs.f1.elements.forward.path`.

## Current behavior (dev `a9a68082414`)

- `lib/galaxy/managers/tools.py` `create_unprivileged_tool` runs `lint_user_tool_source` and then `_validate_tool_templates`.
- `_validate_tool_templates` → `lib/galaxy/tools/expressions/evaluation.py:30` `validate_expression_template` only scans for unterminated `$(` / `${`. It never looks inside.
- `lib/galaxy/tool_util/lint.py:338` `lint_user_tool_source` runs the generic tool linters. None of them inspects expression bodies.
- The runtime models already exist: `lib/galaxy/tool_util_models/parameters.py`:
  - `DataInternalJson` (~832)
  - `DataCollectionElementInternalJson`
  - `DataCollectionPairedRuntime` / `ListRuntime` / `SampleSheetRuntime` / `RecordRuntime` / `PairedOrUnpairedRuntime` / `NestedListRuntime` / `NestedRecordRuntime` (~900-970)
  - They are built by `lib/galaxy/tools/runtime.py:290` `_build_collection_runtime_dict`.

## Proposed linter

A new linter (user-tool-source only; it runs as part of `lint_user_tool_source`):

- For `shell_command`, each `configfiles[].content` and output `label`, extract each `$(...)` body and `${...}` block, and parse it as JS. The bodies are ternaries, template literals and calls, so a regex won't do. Options: a small Python JS parser such as `esprima`/`pyjsparser` (new dependency, so weigh it), or evaluating with a recording `Proxy` in the existing JS sandbox using stub inputs built from the models. The second option needs no new dependency and handles branches only if both sides get evaluated, so think it through.
- Collect `inputs.<name>.<member>…` chains. Resolve `<name>` against the declared inputs, including sections, conditionals and repeats. Walk the members against the pydantic runtime model selected by parameter type and `collection_type`:
  - `data` → `DataInternalJson` fields
  - `paired` → `elements.forward|reverse`
  - `paired_or_unpaired` → `elements.<id>` plus `has_single_item`
  - `list` / `sample_sheet` → array
  - `record` → `elements.<field>`
  - scalars → no members
- Unknown member → lint ERROR. A string method on a leaf value is allowed. Aliased or computed access → skip.

## Caveats

- The legacy input builder (`/api/tools` path, or a failed workflow step-state capture) produces a bare `{forward, reverse}` for paired inputs, so the egapx expression "works" there by accident. Pick the modern runtime model as canonical. Separately, consider whether the legacy shape should still be produced at all; two shapes for one tool is a trap.
- On a mapped-over `data` input, `element_identifier` is a declared field but `null` at runtime (#24434, #24422). That's out of scope.

## Suggested red test (not written or run)

`test/unit/tool_util/` (next to the existing lint tests): build a `UserToolSource` with a `paired_or_unpaired` collection input and `shell_command: "cat '$(inputs.reads.forward.path)'"`, then assert that `lint_user_tool_source` returns an error bullet naming `forward`. Add a passing control with `inputs.reads.elements.forward.path`. API level: `POST /api/unprivileged_tools` with the bad tool returns 400 (`test_unprivileged_tools.py` has the role setup).
