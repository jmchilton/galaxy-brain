# Plan: YAML Modeling Bug Fix, Test Coverage, and Polish

## Overview

Post-implementation cleanup for `COLLECTION_SEMANTICS_PLAN_YAML_MODELING.md`. Fixes a bug where `NestedElements.elements` is typed `dict[str, Any]` (prevents Pydantic from parsing nested output bindings), adds comprehensive test coverage for all 32 `as_latex()` round-trips and uncovered model classes, and applies polish to union discriminators and naming.

## Critical Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Bug fix + polish |
| `test/unit/data/model/test_collection_semantics.py` | New tests |
| `doc/source/dev/collection_semantics.md` | Regenerate after bug fix |

---

## Step 1: Fix `NestedElements.elements` Forward Reference Bug

**File:** `semantics.py:224`

**Problem:** `NestedElements.elements` is `dict[str, Any]`. Pydantic leaves nested values as raw dicts, so `_output_elements_to_latex()` calls `value.as_latex()` on a `dict` → `AttributeError`. Affects 5 `nested_elements` usages across 3 examples (`NESTED_LIST_MAPPING`, `BASIC_MAPPING_LIST_PAIRED_OR_UNPAIRED`, `MAPPING_LIST_LIST_OVER_PAIRED_OR_UNPAIRED`).

**Fix:**
1. Change `elements: dict[str, Any]` → `elements: dict[str, "OutputBinding"]` (forward ref string)
2. After `OutputBinding = Union[...]` on line 230, add `NestedElements.model_rebuild()`

**Verify:** Run existing tests. Then run `PYTHONPATH=lib python lib/galaxy/model/dataset_collections/types/semantics.py` to regenerate docs — should succeed without crash.

## Step 2: Regenerate Docs

After Step 1, run doc generation and diff against current `doc/source/dev/collection_semantics.md`. Commit the regenerated file.

## Step 3: Add `as_latex()` Round-Trip Test for All 32 Examples

**File:** `test_collection_semantics.py`

Add a single parametrized test that loads the YAML, iterates all `ExampleEntry` items with `then`, calls `example.then.as_latex()`, and asserts it succeeds (no crash). This is the "does it not crash" smoke test that would have caught the `NestedElements` bug.

```python
def test_all_then_as_latex_succeeds():
    """Every then expression produces valid LaTeX without error."""
    root = _load_root_model()
    for entry in root.root:
        if isinstance(entry, ExampleEntry) and entry.example.then:
            latex = entry.example.then.as_latex()
            assert isinstance(latex, str)
            assert len(latex) > 0, f"{entry.example.label} produced empty LaTeX"
```

## Step 4: Add `generate_docs()` Smoke Test

Add a test that calls `generate_docs()` end-to-end. This exercises the full pipeline (YAML load → model parse → LaTeX render → markdown write). No snapshot comparison needed — just assert no crash.

```python
def test_generate_docs_succeeds():
    """generate_docs() runs to completion without errors."""
    generate_docs()
```

Import `generate_docs` in the test file imports.

## Step 5: Add Unit Tests for Uncovered Model Classes

### 5a: `EllipsisMarker.as_latex()`

```python
def test_ellipsis_marker_as_latex():
    m = EllipsisMarker(type="ellipsis")
    assert m.as_latex() == "..."
```

### 5b: `DatasetListInput.as_latex()`

```python
def test_dataset_list_input_as_latex():
    d = DatasetListInput(type="dataset_list", refs=["d_1", "...", "d_n"])
    assert d.as_latex() == "[d_1,...,d_n]"
```

### 5c: `NestedElements.as_latex()` (depends on Step 1 fix)

```python
def test_nested_elements_as_latex():
    ne = NestedElements.model_validate({
        "type": "nested_elements",
        "elements": {
            "forward": {
                "type": "tool_output_ref",
                "invocation": {"inputs": {"i": {"type": "dataset", "ref": "d_f"}}},
                "output": "o",
            },
            "reverse": {
                "type": "tool_output_ref",
                "invocation": {"inputs": {"i": {"type": "dataset", "ref": "d_r"}}},
                "output": "o",
            },
        },
    })
    result = ne.as_latex()
    assert "\\text{forward}=" in result
    assert "\\text{reverse}=" in result
    assert "tool(i=d_f)[o]" in result
```

### 5d: `CollectionOutput.as_latex()` with Ellipsis

```python
def test_collection_output_with_ellipsis_as_latex():
    co = CollectionOutput.model_validate({
        "type": "collection",
        "collection_type": "list",
        "elements": {
            "el1": {
                "type": "tool_output_ref",
                "invocation": {"inputs": {"i": {"type": "dataset", "ref": "d_1"}}},
                "output": "o",
            },
            "...": {"type": "ellipsis"},
            "eln": {
                "type": "tool_output_ref",
                "invocation": {"inputs": {"i": {"type": "dataset", "ref": "d_n"}}},
                "output": "o",
            },
        },
    })
    result = co.as_latex()
    assert "\\text{list}" in result
    # Verify no space around ellipsis
    assert ",...," in result
```

### 5e: `MapOverInput` with Compound `sub_collection_type`

```python
def test_map_over_input_compound_sub_collection_type():
    mi = MapOverInput(type="map_over", collection="C", sub_collection_type="list:paired_or_unpaired")
    result = mi.as_latex()
    assert "\\text{list}:\\text{paired\\_or\\_unpaired}" in result
```

### 5f: `MapOverThen` Producing `DatasetOutput`

No current YAML example has this, but the schema allows it. Test the code path.

```python
def test_map_over_then_produces_dataset():
    then = MapOverThen(
        type="map_over",
        invocation=ToolInvocation(inputs={"i": MapOverInput(type="map_over", collection="C")}),
        produces={"o": DatasetOutput(type="dataset")},
    )
    result = then.as_latex()
    assert "\\mapsto" in result
    assert "\\text{dataset}" in result
```

## Step 6: Add Discriminated Union Annotations

**File:** `semantics.py`

Add `Annotated` import (from `typing`) and `Field(discriminator="type")` to the 4 union type aliases for better validation error messages and performance.

```python
from typing import Annotated

InputBinding = Annotated[
    Union[DatasetInput, MapOverInput, CollectionInput, DatasetListInput],
    Field(discriminator="type"),
]

OutputBinding = Annotated[
    Union[DatasetOutput, EllipsisMarker, ToolOutputRef, NestedElements],
    Field(discriminator="type"),
]

OutputSpec = Annotated[
    Union[DatasetOutput, CollectionOutput],
    Field(discriminator="type"),
]

ThenExpression = Annotated[
    Union[MapOverThen, ReductionThen, EquivalenceThen, InvalidThen],
    Field(discriminator="type"),
]
```

After this change, run all tests to verify nothing breaks. The `model_rebuild()` call from Step 1 may need to move after the `Annotated` definition.

## Step 7: Rename `elements_to_latex` → `_assumption_elements_to_latex`

**File:** `semantics.py`

Rename the function at line 80 from `elements_to_latex` to `_assumption_elements_to_latex`. Update all call sites:
- `semantics.py:87` (recursive self-call)
- `semantics.py:101` (`CollectionDefinition.as_latex`)
- `test_collection_semantics.py:33` (import)
- `test_collection_semantics.py:110,117,123` (test calls)

This disambiguates it from `_output_elements_to_latex` (line 126) and marks it as private (consistent with the other helper).

---

## Execution Order

| # | Step | Red-to-green? | Risk |
|---|------|---------------|------|
| 1 | Fix `NestedElements.elements` forward ref | N/A — bug fix | Low |
| 2 | Regenerate docs | N/A | Low |
| 3 | `test_all_then_as_latex_succeeds` | Write test → already green after Step 1 | Low |
| 4 | `test_generate_docs_succeeds` | Write test → already green after Step 1 | Low |
| 5a-f | Unit tests for uncovered models | Write test → green (all models already implemented) | Low |
| 6 | Discriminated union annotations | Refactor — all tests should stay green | Medium (Pydantic behavior change) |
| 7 | Rename `elements_to_latex` | Refactor — find-and-replace | Low |

## Unresolved Questions

1. Step 6: Does `Annotated[Union[...], Field(discriminator="type")]` interact correctly with `NestedElements.model_rebuild()` forward ref resolution? Need to verify ordering.
2. Step 4: `generate_docs()` writes to disk — should the test use a tmpdir/mock, or is writing to the real file acceptable in unit tests?
