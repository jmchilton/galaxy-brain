# Plan: Structured YAML Modeling for `then` Expressions -- DONE

## Overview

Convert the 32 free-form `then` string expressions in `collection_semantics.yml` into structured, typed YAML to enable richer rendering, validation, and programmatic use.

## Catalog of All `then` Expressions (32 total)

### Category A: Map-Over Producing Implicit Collection (8)
| Label | Expression |
|-------|-----------|
| `BASIC_MAPPING_PAIRED` | `tool(i=mapOver(C)) ~> {o: collection<paired, ...>}` |
| `BASIC_MAPPING_PAIRED_OR_UNPAIRED_PAIRED` | `tool(i=mapOver(C)) ~> {o: collection<paired_or_unpaired,...>}` |
| `BASIC_MAPPING_PAIRED_OR_UNPAIRED_UNPAIRED` | `tool(i=mapOver(C)) ~> {o: collection<paired_or_unpaired,...>}` |
| `BASIC_MAPPING_LIST` | `tool(i=mapOver(C)) ~> {o: collection<list,...>}` |
| `NESTED_LIST_MAPPING` | `tool(i=mapOver(C)) ~> {o: collection<list:list,...>}` |
| `BASIC_MAPPING_LIST_PAIRED_OR_UNPAIRED` | `tool(i=mapOver(C)) ~> {o: collection<list:paired_or_unpaired,...>}` |
| `BASIC_MAPPING_INCLUDING_SINGLE_DATASET` | `tool(i=mapOver(C),i2=d_o) ~> ...` |
| `BASIC_MAPPING_TWO_INPUTS_WITH_IDENTICAL_STRUCTURE` | `tool(i=mapOver(C1), i2=mapOver(C2)) ~> ...` |

### Category B: Direct Reduction (4)
| Label | Expression |
|-------|-----------|
| `COLLECTION_INPUT_PAIRED` | `tool(i=C) -> {o: dataset}` |
| `COLLECTION_INPUT_LIST` | `tool(i=C) -> {o: dataset}` |
| `COLLECTION_INPUT_PAIRED_OR_UNPAIRED` | `tool(i=C) -> {o: dataset}` |
| `COLLECTION_INPUT_LIST_PAIRED_OR_UNPAIRED` | `tool(i=C) -> {o: dataset}` |

### Category C: Invalid Operations (10)
Bare invocations with `is_valid: false`. Includes `COLLECTION_INPUT_LIST_PAIRED_NOT_CONSUMES_PAIRED_PAIRED` and `COLLECTION_INPUT_LIST_PAIRED_OR_NOT_PAIRED_NOT_CONSUMES_PAIRED_PAIRED` added in `ebdc057528`.

### Category D: Equivalence Assertions (4)
Using `==` operator: `LIST_REDUCTION`, `PAIRED_OR_UNPAIRED_CONSUMES_PAIRED`, `MAPPING_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`, `MAPPING_LIST_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`.

### Category E: Explicit Invalidity (1)
`PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_PAIRED` uses "is invalid" text.

### Category F: Sub-collection Map-Over (3)
`MAPPING_LIST_PAIRED_OVER_PAIRED`, `NESTED_LIST_REDUCTION`, `MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED`. Note: the last uses compound `sub_collection_type` `list:paired_or_unpaired`.

### Category G: Single-dataset Sub-collection (2)
`MAPPING_LIST_OVER_PAIRED_OR_UNPAIRED`, `MAPPING_LIST_LIST_OVER_PAIRED_OR_UNPAIRED`. The latter produces `list:list` output (vs `list` for the former).

## Proposed Structured YAML Schema

### Top-Level `then` Discriminated Union

```yaml
# map_over: tool with mapOver producing implicit collection
then:
  type: map_over
  invocation: <ToolInvocation>
  produces: <OutputMap>

# reduction: tool consumes collection directly
then:
  type: reduction
  invocation: <ToolInvocation>
  produces: <OutputMap>

# equivalence: two invocations are semantically equal
then:
  type: equivalence
  left: <ToolInvocation>
  right: <ToolInvocation>

# invalid: operation is not valid
then:
  type: invalid
  invocation: <ToolInvocation>
```

### ToolInvocation

```yaml
invocation:
  inputs:
    <input_name>:
      type: dataset           # direct dataset ref
      ref: d_f

      type: map_over          # mapOver(C) or mapOver(C, 'paired')
      collection: C
      sub_collection_type: paired  # optional

      type: collection        # direct collection input
      ref: C

      type: dataset_list      # inline list [d_1,...,d_n]
      refs: [d_1, "...", d_n]
```

### OutputMap

```yaml
produces:
  <output_name>:
    type: dataset              # simple dataset

    type: collection           # implicit collection
    collection_type: paired
    elements:
      <id>:
        type: tool_output_ref  # tool(i=d_f)[o]
        invocation: <ToolInvocation>
        output: o

        type: nested_elements  # for nested collections
        elements: { ... }
```

### Worked Example: BASIC_MAPPING_PAIRED

**Current:**
```yaml
then: "tool(i=mapOver(C)) ~> {o: collection<paired,{forward=tool(i=d_f)[o], reverse=tool(i=d_r)[o]}>}"
```

**Proposed:**
```yaml
then:
  type: map_over
  invocation:
    inputs:
      i:
        type: map_over
        collection: C
  produces:
    o:
      type: collection
      collection_type: paired
      elements:
        forward:
          type: tool_output_ref
          invocation:
            inputs:
              i: { type: dataset, ref: d_f }
          output: o
        reverse:
          type: tool_output_ref
          invocation:
            inputs:
              i: { type: dataset, ref: d_r }
          output: o
```

### Worked Example: COLLECTION_INPUT_PAIRED (Reduction)

```yaml
then:
  type: reduction
  invocation:
    inputs:
      i: { type: collection, ref: C }
  produces:
    o: { type: dataset }
```

## Pydantic Model Changes

New models in `semantics.py`:

```python
# Input binding types (discriminated union on "type")
DatasetInput, MapOverInput, CollectionInput, DatasetListInput

# Tool invocation
ToolInvocation(inputs: dict[str, InputBinding])

# Output types
DatasetOutput, ToolOutputRef, NestedElements, CollectionOutput

# Top-level then types (discriminated union on "type")
MapOverThen, ReductionThen, EquivalenceThen, InvalidThen
```

`Example.then` changes from `Optional[str]` to `Optional[Union[str, ThenExpression]]` during migration, then to `Optional[ThenExpression]` after full migration.

## LaTeX Rendering

Replace `expression_to_latex()` string substitution with `as_latex()` methods on each Pydantic model. Each model knows how to render itself to LaTeX. The `generate_docs()` dispatch changes from:
```python
expression_to_latex(example.then)
```
to:
```python
example.then.as_latex()
```

## Migration Approach (3 Phases)

### Phase 1: Add new models, keep backward compat
1. Add all new Pydantic models + `as_latex()` methods
2. Change `Example.then` to `Union[str, ThenExpression]`
3. Keep `expression_to_latex()` for string case
4. Dispatch on `isinstance` in `generate_docs()`

### Phase 2: Convert YAML expressions by category (simplest first)
1. Category C (10 invalid) - simplest structure
2. Category B (4 reductions)
3. Category D (4 equivalences)
4. Category E (1 explicit invalid)
5. Category A (8 map-overs) - most complex
6. Categories F+G (5 sub-collection)

For each: convert YAML, run doc gen, diff markdown to verify identical LaTeX output.

### Phase 3: Remove backward compat
1. Remove `str` from Union
2. Remove `expression_to_latex()`
3. Clean up dispatch

## Testing Strategy (Red-to-Green)

**Test file:** `test/unit/data/model/test_collection_semantics.py` (existing -- 40 tests for models, LaTeX helpers, validators)

1. **`as_latex()` round-trip tests**: For each of 32 expressions, assert structured `.as_latex()` matches `expression_to_latex(original_string)`. Write test first, implement to make green.
2. **Pydantic validation tests**: Assert model_validate produces correct types/fields.
3. **Full doc generation regression test**: Diff generated markdown against snapshot.

**Test ordering:**
- InvalidThen tests -> implement -> ReductionThen tests -> implement -> ... up to MapOverThen with nested outputs.

## Critical Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/types/semantics.py` | All new Pydantic models + `as_latex()` methods |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Migrate all `then` strings to structured YAML |
| `doc/source/dev/collection_semantics.md` | Regression baseline for LaTeX output |
| `test/unit/data/model/test_collection_semantics.py` | Existing test file (40 tests) |

## Potential Challenges

- **Ellipsis representation**: `...` pattern in elements needs `_ellipsis: true` sentinel or list-of-pairs approach
- **Escaped backslashes**: Current `C\\_PAIRED` becomes raw `C_PAIRED` with LaTeX escaping in renderer - cleaner
- **Verbosity**: Structured YAML is 5-15x more lines per expression - trade-off for machine-readability

## Unresolved Questions

1. `_ellipsis` sentinel key in dict vs list-of-pairs with explicit ellipsis entry type?
2. Should `is_valid: false` be removed in favor of `type: invalid`, or kept as redundant validation?
3. Should schema support future expression types beyond current 4 (e.g., `collection_creation`)?
