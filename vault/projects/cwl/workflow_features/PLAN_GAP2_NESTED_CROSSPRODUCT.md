# Plan: Implement `nested_crossproduct` Scatter Method

## Summary

CWL `nested_crossproduct` with `scatter: [A, B]` where A has N elements and B has M
creates N*M jobs, returning a nested array-of-arrays: N outer elements each containing
M inner elements. First scatter param = outer, second = inner.

## Status

### DONE — CWL tool step crossproduct + valueFrom

All implemented on branch `cwl_fixes_6` (commit `f538dbc099`). Tests passing:
- `wf_scatter_two_nested_crossproduct` — basic two-array crossproduct
- `wf_scatter_nested_crossproduct_secondempty` — empty second input → `[[], []]`
- `wf_scatter_nested_crossproduct_firstempty` — empty first input → `[]`
- `wf_scatter_twoparam_nested_crossproduct_valuefrom` — crossproduct with valueFrom
- `wf_scatter_twoparam_dotproduct_valuefrom` — dotproduct with valueFrom (bonus fix)

### NOT STARTED — Subworkflow crossproduct (v1.2 tests)

Tests still in RED_TESTS:
- `nested_crossproduct_simple_scatter`
- `simple_nested_crossproduct_scatter`
- `nested_crossproduct_nested_crossproduct_scatter`

**Why blocked**: Subworkflow scatter uses a fundamentally different mechanism than tool
scatter. `SubWorkflowModule.execute` passes `collection_info` as
`subworkflow_collection_info` to the inner workflow — the inner tools then use
`progress.subworkflow_structure` to determine mapping. The inner tools call
`_find_collections_to_match` → `walk_collections` which is inherently a dot-product
walker (it indexes all collections at the same position in lockstep).

For crossproduct on subworkflows, `walk_collections` can't work because the two scatter
inputs have independent iteration order. `collection_info.collections` is also empty
for unlinked collections (only `unlinked_collections` is populated), so inner tools
can't find the HDCAs to map over.

**Options**:
1. Create synthetic nested HDCA (list:list) pre-computing the cross product, pass as
   linked collection to subworkflow — inner tools see it as a single list:list structure
2. Extend `walk_collections` to support cross-product walking — significant change to
   `structure.py` and `_walk_collections`
3. Iterate at SubWorkflowModule level (invoke subworkflow N*M times) — but this breaks
   the current architecture where subworkflows are invoked once

## Code Changes (Implemented)

### 1. Add `slice_collections_crossproduct()` to `MatchingCollections`

**File**: `lib/galaxy/model/dataset_collections/matching.py`

Added `unlinked_collections: OrderedDict` to store HDCA refs for unlinked collections.
Added `slice_collections_crossproduct()` using `itertools.product` to yield cartesian
product of collection elements. Updated `for_collections` to populate
`unlinked_collections` alongside `unlinked_structures`.

### 2. Modify `find_cwl_scatter_collections()` (CWL tool step path)

**File**: `lib/galaxy/workflow/modules.py`

Added `_get_cwl_scatter_method(step)` helper. When scatter method is crossproduct,
scatter inputs are added with `linked=False`.

### 3. Modify CWL tool execution to use cross-product slicing

**File**: `lib/galaxy/workflow/modules.py`

After `collection_info = match_collections(...)`, detect scatter method and use
`slice_collections_crossproduct()` instead of `slice_collections()`.

### 4. Expand assertion in `_find_collections_to_match()` (subworkflow path)

**File**: `lib/galaxy/workflow/modules.py`

Assertion now accepts `nested_crossproduct` and `flat_crossproduct`. All `.add()` calls
pass `linked=not is_crossproduct`. SubWorkflowModule.execute also checks scatter method
for crossproduct slicing.

### 5. Fix CWL parser scatter_type assignment

**File**: `lib/galaxy/tool_util/cwl/parser.py`

Bug: when `scatterMethod` was defined on a step, ALL inputs got that scatter type —
even non-scattered inputs. This caused non-scatter inputs (e.g. valueFrom-only inputs
with `source` pointing to an HDCA) to be included in scatter iteration, replacing their
full-collection value with the first element.

Fix: gate on `self.scatter` (whether the input is in the scatter list) instead of
checking for `scatterMethod` key presence. Non-scatter inputs always get `"disabled"`.

### 6. Fix `to_cwl()` for list-of-records

**File**: `lib/galaxy/workflow/modules.py`

Bug: `to_cwl()` used `value.dataset_elements` for list collections, which only returns
HDA children. For a list-of-records (where children are sub-collections), this returned
`[]`. valueFrom expressions like `$(self[0].instr)` then failed with `undefined`.

Fix: use `value.elements` instead, which returns all children (HDAs and sub-collections
alike). The existing recursive `to_cwl()` handles both types correctly.

### 7. Remove from RED_TESTS

**File**: `scripts/cwl_conformance_to_test_cases.py`

Removed from v1.0, v1.1, v1.2:
- `wf_scatter_two_nested_crossproduct`
- `wf_scatter_nested_crossproduct_firstempty`
- `wf_scatter_nested_crossproduct_secondempty`
- `wf_scatter_twoparam_nested_crossproduct_valuefrom`
- `wf_scatter_twoparam_dotproduct_valuefrom`

Still in RED_TESTS (subworkflow path not implemented):
- `nested_crossproduct_simple_scatter`
- `nested_crossproduct_nested_crossproduct_scatter`
- `simple_nested_crossproduct_scatter`

## Relationship to flat_crossproduct

Both methods share:
- `linked=False` collection matching
- `slice_collections_crossproduct()` iteration (identical job/param generation)
- Detection logic in both scatter code paths

They differ only in output collection structure:
- `nested_crossproduct`: `list:list` (natural from `multiply`)
- `flat_crossproduct`: `list` (flattened)

**Recommendation**: flat_crossproduct needs additional flattening logic or the
synthetic-HDCA approach from PLAN_GAP1.

## Resolved Questions

1. **Scatter input ordering**: Yes, preserved. `OrderedDict` in `unlinked_collections`
   maintains insertion order (first=outer, second=inner). Tests confirm correct output.
2. **Linked/unlinked conflicts**: No conflicts — `unlinked_collections` is a separate
   dict from `collections`. Both can coexist.
3. **Empty collections**: Works correctly. `itertools.product` with an empty list yields
   nothing (firstempty → `[]`), and product with empty second yields empty inner lists
   (secondempty → `[[], []]`).

## Remaining Questions

1. For subworkflow tests, `subworkflow_collection_info` propagation does NOT handle
   crossproduct correctly — `walk_collections` is dot-product only and `collections`
   dict is empty for unlinked. Needs architectural decision (see options above).
2. flat_crossproduct reuse: `slice_collections_crossproduct()` generates the same
   iterations, but output structure needs flattening. TBD whether post-flatten or
   synthetic-HDCA is better.

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/matching.py` | Added unlinked tracking + `slice_collections_crossproduct()` |
| `lib/galaxy/workflow/modules.py` | Modified both scatter paths, added helper, updated execution loops, fixed `to_cwl()` |
| `lib/galaxy/tool_util/cwl/parser.py` | Fixed scatter_type for non-scatter inputs |
| `scripts/cwl_conformance_to_test_cases.py` | Removed 5 tests from RED_TESTS (all 3 versions) |
