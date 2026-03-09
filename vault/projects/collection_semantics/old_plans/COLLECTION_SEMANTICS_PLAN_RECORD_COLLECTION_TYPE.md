# Plan: Add `record` Collection Type Semantics Coverage

## Overview

The `record` collection type is a CWL-derived concept with arbitrary named fields (defined via a `fields` parameter), unlike `paired` (fixed forward/reverse) or `list` (ordered, arbitrary count). It is already registered in the type registry and accepted by the validation regex on both Python and TypeScript sides, but has **zero** documentation in the semantics spec, **no** workflow editor terminal tests, and **no** runtime map-over tests.

## Key Characteristics of `record`

- Arbitrary named fields defined by a `fields` parameter (vs `paired`'s fixed forward/reverse)
- Registered in type registry alongside paired, list, paired_or_unpaired
- Validation regex on both Python and TypeScript sides already accepts it
- Structural similarity to `paired` (named elements, tuple-like) but dynamic schema

## New YAML Spec Entries (6 areas)

### 1. Mapping Examples

```yaml
- example:
    label: BASIC_MAPPING_RECORD
    assumptions:
    - datasets: [d_a, d_b, d_c]
    - tool:
        in: {i: dataset}
        out: {o: dataset}
    - collections:
        C: [record, {field_a: d_a, field_b: d_b, field_c: d_c}]
    then: "tool(i=mapOver(C)) ~> {o: collection<record, {field_a=tool(i=d_a)[o], field_b=tool(i=d_b)[o], field_c=tool(i=d_c)[o]}>}"
    tests:
        workflow_editor: "accepts record data -> data connection"
```

### 2. Reduction Examples

```yaml
- example:
    label: COLLECTION_INPUT_RECORD
    assumptions:
    - tool:
        in: {i: "collection<record>"}
        out: {o: dataset}
    - collections:
        C: [record, {field_a: d_a, field_b: d_b}]
    then: "tool(i=C) -> {o: dataset}"
    tests:
        workflow_editor: "accepts record -> record connection"
```

### 3. Incompatibility Examples (4 entries)

- `COLLECTION_INPUT_LIST_NOT_CONSUMES_RECORD` -- list input rejects record (`is_valid: false`)
- `COLLECTION_INPUT_RECORD_NOT_CONSUMES_LIST` -- record input rejects list (`is_valid: false`)
- `COLLECTION_INPUT_PAIRED_NOT_CONSUMES_RECORD` -- paired input rejects record (`is_valid: false`)
- `COLLECTION_INPUT_RECORD_NOT_CONSUMES_PAIRED` -- record input rejects paired (`is_valid: false`)

### 4. Multi-data Reduction

Open question: should `record` be reducible by `dataset<multiple=true>` inputs? Code currently permits it (unlike `paired`). If yes:

```yaml
- example:
    label: RECORD_REDUCTION
    assumptions:
    - tool:
        in: {i: "dataset<multiple=true>"}
        out: {o: dataset}
    - collections:
        C: [record, {field_a: d_a, field_b: d_b}]
    then: "tool(i=C) == tool(i=[d_a, d_b])"
```

### 5. Sub-collection Mapping

```yaml
- example:
    label: MAPPING_LIST_RECORD_OVER_RECORD
    assumptions:
    - tool:
        in: {i: "collection<record>"}
        out: {o: dataset}
    - collections:
        C: ["list:record", {el1: {field_a: d_a, field_b: d_b}}]
    then: "tool(i=mapOver(C, 'record')) ~> {o: collection<list, {el1: tool(i=C_RECORD)[o]}>}"
    tests:
        workflow_editor: "accepts list:record -> record connection"
```

### 6. Documentation Section

New `## record Collections` section explaining:
- Fields concept and dynamic schema
- CWL origin
- Comparison with `paired` (both tuple-like, but `record` has dynamic fields)
- Type compatibility rules (no cross-compatibility with list, paired, or paired_or_unpaired)

## Test Changes

### `parameter_steps.json`
Add fixture steps:
- `record input` -- tool with `record` collection output
- `list:record input` -- tool with `list:record` collection output
- `record collection input` -- tool accepting `collection<record>`

### `terminals.test.ts`
7 new test cases:
1. `"accepts record data -> data connection"` (mapping)
2. `"accepts record -> record connection"` (direct match)
3. `"rejects record -> list connection"` (type mismatch)
4. `"rejects list -> record connection"` (type mismatch)
5. `"rejects record -> paired connection"` (type mismatch)
6. `"rejects paired -> record connection"` (type mismatch)
7. `"accepts list:record -> record connection"` (sub-collection mapping)

### `test_tool_execute.py`
Runtime API tests:
- Map-over record collection
- Direct record collection consumption
- Sub-collection mapping for list:record

### `semantics.py`
Add `"record"` to `WORDS_TO_TEXTIFY` for consistent LaTeX rendering.

## Implementation Order (Red-to-Green)

1. Add fixture steps to `parameter_steps.json`
2. Write failing `terminals.test.ts` test cases
3. Verify type matching logic handles record (may need no changes if regex already accepts)
4. Tests pass (green)
5. Write failing API tests
6. Implement any missing runtime support
7. API tests pass
8. Add YAML spec entries
9. Update `semantics.py` WORDS_TO_TEXTIFY
10. Regenerate docs

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Add record section + examples |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Add "record" to WORDS_TO_TEXTIFY |
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | 7 new test cases |
| `client/src/components/Workflow/Editor/test-data/parameter_steps.json` | Record fixture steps |
| `lib/galaxy/model/dataset_collections/type_description.py` | Reference for type matching (may need changes) |

## Unresolved Questions

1. Should `record` be reducible by `dataset<multiple=true>` inputs? (Recommend: yes, code currently permits)
2. Should `record` have any type compatibility with `list`? (Recommend: no)
3. Should `paired_or_unpaired` accept `record`? (Recommend: no)
4. Is `list:record` actually used in practice? (Regex permits it, no tests exist)
5. Should the `endsWith("paired")` multi-data guard also block `record`? (Currently does not)
