# First Planning Steps

## Step 1: Audit Parameter Type Coverage

Inventory every Galaxy parameter type and assess current handling in:
- Native validation (`validation_native.py`)
- Format2 validation (`validation_format2.py`)
- State conversion (`convert.py`)

Produce a coverage matrix. Prioritize by frequency in IWC workflows (text, integer, float, boolean, select, conditional, repeat, section, data, data_collection cover ~95% of real usage).

## Step 2: Design the `state` JSON Schema / Pydantic Model

The Format2 `state` block needs a formal schema. Design how to derive it from the existing `workflow_step` representation:
- Can `workflow_step` Pydantic models be reused directly for validating `state`?
- What adaptations are needed? (`state` omits connected params, uses structured dicts not JSON strings, has no `ConnectedValue`/`__current_case__`/`__page__`)
- Should a new state representation (e.g., `format2_state`) be added, or is `workflow_step` sufficient with pre-processing?
- How does `$link` in `state` interact with the schema?

## Step 3: Design the Conversion Interface

Define the contract for `tool_state` ↔ `state` conversion:
- Input/output types
- How tool definitions are provided (the `GetToolInfo` protocol, or direct `ParsedTool`/`ToolParameterBundleModel`?)
- Error handling strategy (structured errors vs exceptions, partial conversion vs all-or-nothing)
- Where in the package hierarchy this lives

Plan how conversion handles each parameter type, especially:
- Conditionals: `__current_case__` inference from selector values
- Repeats: array ↔ indexed-key mapping
- Connections: `ConnectedValue` ↔ `in`/`$link` extraction/injection
- Defaults: should conversion fill missing defaults or leave them absent?

## Step 4: Implement Core Scalar + Container Conversion

Build out the conversion for the common parameter types in priority order:
1. Scalars: text, integer, float, boolean, color, hidden
2. Select (including dynamic selects — may need special handling)
3. Sections
4. Conditionals (with `__current_case__` inference)
5. Repeats
6. Data/collection (ConnectedValue extraction)

Red-to-green: write test cases for each type before implementing.

## Step 5: Wire Validation into gxformat2 Lint Path

Design how gxformat2's linter can optionally consume tool schemas:
- Extend `ImporterGalaxyInterface` or introduce a parallel interface?
- How are tool schemas provided? (local tool XML, Tool Shed API response, pre-built `ParsedTool` objects?)
- What lint messages should be emitted for invalid state?

## Step 6: Design the Round-Trip Test Harness

Plan the D5 round-trip validation:
- What "semantically equivalent" means precisely (which fields to compare, which to ignore)
- How to handle fields that legitimately differ (`__current_case__` ordering, default filling, key ordering)
- Test corpus: start with framework test workflows, expand to IWC workflows
- Where this utility lives (galaxy-tool-util CLI? gxformat2 CLI? both?)

## Step 7: Plan Format2 Export Integration

Design how Galaxy's export path changes:
- Where does the schema-aware conversion plug into `from_galaxy_native()`?
- How does the UI offer Format2 download? (new API param? separate endpoint?)
- Fallback behavior when conversion fails
- What metadata is needed beyond tool state (comments are already known-lost; anything else?)

## Unresolved Questions

- New `format2_state` representation or reuse `workflow_step` with pre-processing?
- Should conversion fill tool defaults or preserve only explicitly-set values?
- Where does the round-trip utility live — galaxy-tool-util, gxformat2, or a new package?
- Should Format2 export use `state` (fully decoded) or offer both `state` and `tool_state` output modes?
- How to handle tools not available to the validator (missing from Tool Shed, local-only tools)?
- Does the `$link` syntax in `state` need schema-level support or just pre-processing before validation?
