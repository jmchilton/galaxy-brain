# Plan: Include Test-Only Examples in Generated Docs -- DONE (`ebdc057528`)

## Problem

`collect_docs_with_examples()` in `semantics.py` line 149 filters `if entry.example.then:`, silently dropping 5 examples that have `workflow_editor` tests but no `then` expression. These examples are invisible in the generated docs despite being part of the spec.

## Affected Examples

| Label | Tests | Assumptions |
|-------|-------|-------------|
| `COLLECTION_INPUT_LIST_PAIRED_NOT_CONSUMES_PAIRED_PAIRED` | workflow_editor | none |
| `COLLECTION_INPUT_LIST_PAIRED_OR_NOT_PAIRED_NOT_CONSUMES_PAIRED_PAIRED` | workflow_editor | none |
| `MAPPING_LIST_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED` | workflow_editor | none |
| `MAPPING_LIST_LIST_OVER_PAIRED_OR_UNPAIRED` | workflow_editor | none |
| `MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED` | workflow_editor | none |

All 5 are test-only: no `assumptions`, no `then`, no `is_valid` override. They exist solely to reference `terminals.test.ts` test cases.

## Options

### Option A: Add `then` + `assumptions` to each (Recommended)

Flesh out each example with proper assumptions, collection definitions, and `then` expressions so they render like all other examples. This makes the spec self-contained -- every example documents its semantics, not just its test reference.

Concrete additions needed:

1. **`COLLECTION_INPUT_LIST_PAIRED_NOT_CONSUMES_PAIRED_PAIRED`** -- `list:paired` input rejects `paired:paired` collection
2. **`COLLECTION_INPUT_LIST_PAIRED_OR_NOT_PAIRED_NOT_CONSUMES_PAIRED_PAIRED`** -- `list:paired_or_unpaired` input rejects `paired:paired` collection
3. **`MAPPING_LIST_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`** -- `list:list:paired` maps over `paired_or_unpaired` input producing `list:list`
4. **`MAPPING_LIST_LIST_OVER_PAIRED_OR_UNPAIRED`** -- `list:list` maps over `paired_or_unpaired` input producing `list`
5. **`MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED`** -- `list:list` maps over `list:paired_or_unpaired` input producing flat `list`

### Option B: Render test-only examples differently

Change `collect_docs_with_examples()` to include examples without `then`. Render them as stub admonitions showing only the label and test references. No math block.

### Option C: Both

Add `then`/`assumptions` AND relax the filter so any future test-only examples also appear.

## Recommendation

**Option A** -- it makes the spec more complete and each example follows the same pattern. The filter change (Option B) is cheap insurance but less important once all examples have `then`.

## Result

Implemented Option A. Added `assumptions`, `then`, and `is_valid` to all 5 examples. Added unit test `test_all_tested_examples_have_then` to enforce every example with test refs has a `then` expression. Step 2 (filter relaxation) skipped per user direction. 40 tests pass.

## Implementation Steps

### Step 1: Add `then` + `assumptions` to the 5 examples

Pattern for invalid cases (examples 1-2):
```yaml
- example:
    label: COLLECTION_INPUT_LIST_PAIRED_NOT_CONSUMES_PAIRED_PAIRED
    assumptions:
    - datasets: [d_f, d_r]
    - tool:
        in: {i: "collection<list:paired>"}
        out: {o: dataset}
    - collections:
        C: ["paired:paired", {forward: {forward: d_f, reverse: d_r}, reverse: {forward: d_f, reverse: d_r}}]
    then: "tool(i=C)"
    is_valid: false
    tests:
        workflow_editor: "rejects paired:paired -> list:paired connection"
```

Pattern for valid mapping cases (examples 3-5):
```yaml
- example:
    label: MAPPING_LIST_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED
    assumptions:
    - datasets: [d_f, d_r]
    - tool:
        in: {i: "collection<paired_or_unpaired>"}
        out: {o: dataset}
    - collections:
        C: ["list:list:paired", {o1: {el1: {forward: d_f, reverse: d_r}}}]
    then: "tool(i=mapOver(C, 'paired_or_unpaired')) ~> {o: collection<list:list, {o1: {el1: tool(i=C_POU)[o]}}>}"
    tests:
        workflow_editor: "accepts list:list:paired -> paired_or_unpaired connection"
```

### Step 2: Optionally relax the filter

In `collect_docs_with_examples()`, change:
```python
if entry.example.then:
    current_examples.append(entry)
```
to:
```python
if entry.example.then or entry.example.tests:
    current_examples.append(entry)
```

And in the rendering loop, guard the math block:
```python
if example.then:
    # existing math rendering
```
(This guard already exists at line 214.)

### Step 3: Regenerate docs and verify

Run `semantics.py`, confirm all 5 examples appear in generated markdown.

## Testing (Red-to-Green)

1. Write a unit test that parses the YAML and asserts every `ExampleEntry` with `tests` appears in `collect_docs_with_examples()` output
2. Test fails (5 missing)
3. Apply Step 1 (add `then`/`assumptions`) -- test passes
4. Verify generated docs contain all example labels

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Add assumptions + then to 5 examples |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Optionally relax filter |
| `doc/source/dev/collection_semantics.md` | Regenerated output |

## Unresolved Questions

1. For `MAPPING_LIST_LIST_OVER_PAIRED_OR_UNPAIRED` and `MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED` -- what's the correct `then` expression for mapping `list:list` over `paired_or_unpaired`/`list:paired_or_unpaired` with `single_datasets` semantics? Need to verify against actual runtime behavior.
2. `COLLECTION_INPUT_LIST_PAIRED_OR_NOT_PAIRED_NOT_CONSUMES_PAIRED_PAIRED` label uses `NOT_PAIRED` instead of `UNPAIRED` -- rename for consistency?
3. For the invalid cases (1-2), is `paired:paired` the right collection structure? These collections would need to actually exist for API testing later.
