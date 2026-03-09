# Plan: Fix Scatter into Subworkflow Steps

**Assumes**: EphemeralCollection replaced with CollectionAdapters per
CWL_REPLACE_EPHEMERAL_COLLECTIONS_PLAN.md

## Summary

When a CWL workflow scatters over a subworkflow step, Galaxy passes the entire HDCA
collection reference instead of decomposing it into individual scattered elements.
This causes pydantic validation errors for inner steps expecting scalar inputs.

## Root Cause

**File**: `lib/galaxy/workflow/modules.py`, `find_cwl_scatter_collections()` (~line 469)

The guard condition:
```python
elif not has_explicit_scatter and name not in collection_param_names:
```

When an inner tool step has explicit scatter on input A (e.g., `number`), then
`has_explicit_scatter = True`. This prevents implicit mapping of input B (e.g.,
`letter`) which arrives as an HDCA from the parent subworkflow's scatter but has
`scatter_type = "disabled"` on the inner step. The HDCA reference passes through
to pydantic validation which expects a scalar string.

**Two failure categories:**
- **Category A** (nested scatter): Inner step has its own scatter AND receives
  parent scatter HDCA on a non-scattered input. Tests: `simple_simple_scatter`,
  `dotproduct_simple_scatter`, `simple_dotproduct_scatter`, `dotproduct_dotproduct_scatter`
- **Category B** (subworkflow scatter only): Inner step has no scatter, just receives
  parent scatter HDCA. Tests: `scatter_embedded_subworkflow`,
  `scatter_multi_input_embedded_subworkflow`. May work differently — needs testing.

### How Native Galaxy Handles This

Native Galaxy subworkflow scatter works through `_find_collections_to_match` which
checks `progress.subworkflow_structure` (line 846) to determine when to skip
disabled-scatter inputs. CWL tools bypass this — they use `build_cwl_input_dict` and
`find_cwl_scatter_collections` which don't consult `subworkflow_structure`.

## Post-Ephemeral-Swap State

After the ephemeral collection replacement:
- `replacement_for_input_connections()` returns `CollectionAdapter` subclasses
  (`MergeDatasetsAdapter`, `MergeListsFlattenedAdapter`, etc.) instead of
  `EphemeralCollection`
- `build_cwl_input_dict()` materializes adapters into real HDCAs (see ephemeral plan
  Step 6i) — `_galaxy_to_cwl_ref()` receives HDCAs, not adapters
- `find_cwl_scatter_collections()` continues to load HDCAs via
  `trans.sa_session.get(HDCA, ref["id"])` — works unchanged since adapters are
  persisted before this point
- The scatter iteration loop that previously created `EphemeralCollection` for
  subcollection elements now creates bare HDCAs directly (simpler)

## Code Changes

### 1. Pass `progress` to `find_cwl_scatter_collections()`

**File**: `lib/galaxy/workflow/modules.py`

Update function signature to accept `progress` parameter. At the call site (~line 2762):
```python
collections_to_match = find_cwl_scatter_collections(
    step, cwl_input_dict, trans, tool=tool, progress=progress)
```

### 2. Allow implicit mapping when inside a mapped subworkflow

**File**: `lib/galaxy/workflow/modules.py`, `find_cwl_scatter_collections()` (~line 469)

Change from:
```python
elif not has_explicit_scatter and name not in collection_param_names:
```
To:
```python
elif name not in collection_param_names and (
    not has_explicit_scatter or progress.subworkflow_structure is not None
):
```

When inside a mapped subworkflow (`subworkflow_structure is not None`), allow implicit
mapping of HDCAs for scalar parameters even when the step has explicit scatter on
other inputs.

### 3. Handle subcollection scatter elements (post-ephemeral world)

**File**: `lib/galaxy/workflow/modules.py`, scatter iteration loop (~line 2784)

After slicing collections, when an element's `element_object` is a `DatasetCollection`
(subcollection from scatter over nested collection e.g. list:list), wrap in a bare
HDCA for ID-based referencing. This is NOT a merge operation — no adapter needed.

**Old approach** (pre-swap): Created `EphemeralCollection`, flushed its
`persistent_object` HDCA.

**New approach**: Direct HDCA creation (simpler):
```python
if isinstance(obj, model.DatasetCollection):
    hdca = model.HistoryDatasetCollectionAssociation(
        collection=obj,
        history=invocation.history,
    )
    sa_session.add(hdca)
    sa_session.flush()
    slice_dict[name] = _galaxy_to_cwl_ref(hdca)
```

No adapter needed — just need a persisted HDCA for an ID reference.

### 4. Investigate Category B tests

After applying fixes 1-3, run `scatter_embedded_subworkflow`. Since inner steps have
no explicit scatter (`has_explicit_scatter = False`), the existing condition may already
work. If it still fails, investigate:
- Output collection assembly in `SubWorkflowModule.execute()` for CWL expression outputs
- How `int` outputs from CWL subworkflows are represented as expression.json HDAs

## Interaction Points with Ephemeral Swap

**Point 1**: `_galaxy_to_cwl_ref()` no longer has an `EphemeralCollection` branch.
Adapters are materialized into HDCAs in `build_cwl_input_dict()` (Step 6i of ephemeral
plan) before `_galaxy_to_cwl_ref()` is called, so standard HDCA handling works.

**Point 2**: The scatter iteration loop (line 2784) uses direct HDCA creation instead
of `EphemeralCollection` — simpler, no adapter involvement needed. This wraps a
single subcollection, fundamentally different from the merge operations adapters handle.

**Point 3**: `find_cwl_scatter_collections()` loads HDCAs from DB via
`trans.sa_session.get(HDCA, ref["id"])`. Merge adapters from
`replacement_for_input_connections()` are materialized into HDCAs before this point
(in `build_cwl_input_dict()`), so scatter detection works unchanged.

## Testing Strategy (Red-to-Green)

1. `simple_simple_scatter` (v1.2) — simplest nested scatter case, directly hits the bug
2. `dotproduct_simple_scatter` (v1.2) — dotproduct variant
3. `simple_dotproduct_scatter` (v1.2) — outer simple, inner dotproduct
4. `dotproduct_dotproduct_scatter` (v1.2) — nested dotproduct
5. `scatter_embedded_subworkflow` (v1.1, v1.2) — may need additional investigation
6. `scatter_multi_input_embedded_subworkflow` (v1.1, v1.2) — multi-input variant

**Regression check**: Run existing passing scatter tests:
- `scatter_wf1` through `scatter_wf4` (basic scatter without subworkflow)
- `scatter_valuefrom*` tests
- `wf_wc_scatter_multiple_merge`, `wf_wc_scatter_multiple_flattened`,
  `wf_wc_scatter_multiple_nested` (merge adapter tests from ephemeral swap)

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/workflow/modules.py` | Primary: `find_cwl_scatter_collections()` guard + call site + scatter loop subcollection wrapping |
| `lib/galaxy/workflow/run.py` | Reference: `WorkflowProgress.subworkflow_progress()` |
| `scripts/cwl_conformance_to_test_cases.py` | Remove 6 tests from RED_TESTS |

## Unresolved Questions

1. Do `scatter_embedded_subworkflow` tests fail for same root cause or different?
   Since inner steps have no explicit scatter, `has_explicit_scatter = False`, so
   the current guard may already let them through. Need to run to see actual error.
2. After implicit mapping decomposes the parent-scatter HDCA into elements, does
   `_galaxy_to_cwl_ref(element.element_object)` correctly convert expression.json
   HDAs back to scalar values? Edge cases may exist.
3. Does the `subworkflow_structure` condition correctly distinguish parent-scatter
   HDCAs from genuine array parameters? E.g., if a CWL `int[]` param is passed to
   an inner step that also has scatter — could `subworkflow_structure` cause incorrect
   decomposition?
4. For `scatter_multi_input_embedded_subworkflow`, the `[file1, file2]` merge creates
   a merge adapter (post-swap). Does `SubWorkflowModule` handle this correctly with
   multiple connections in `replacement_for_input_connections`?
5. Verify ordering: adapters materialized in `build_cwl_input_dict()` → flushed →
   then `find_cwl_scatter_collections()` loads by ID. Must confirm this ordering
   holds in the execution flow.
