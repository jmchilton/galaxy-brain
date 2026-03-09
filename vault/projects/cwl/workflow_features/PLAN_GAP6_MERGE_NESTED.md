# Plan: Fix `merge_nested` for Non-Collection Inputs

**Assumes**: EphemeralCollection replaced with CollectionAdapters per
CWL_REPLACE_EPHEMERAL_COLLECTIONS_PLAN.md

## Summary

CWL `linkMerge: merge_nested` wraps each source value in a list. Galaxy implements
this for list→list:list promotion but raises `NotImplementedError` for individual
datasets, and ignores `merge_type` entirely for single-connection inputs.

## Root Cause: Two Bugs

### Bug 1 (causes failing test): Single connection ignores merge_type

**File**: `lib/galaxy/workflow/run.py`, `replacement_for_input_connections` (~line 475)

When `len(connections) == 1`, the method returns the raw HDA ignoring `merge_type`.
With `merge_nested`, even a single connection should produce a 1-element list
collection wrapping the HDA. Test workflow has `source: [file1]` with
`linkMerge: merge_nested`.

### Bug 2 (latent): Multiple individual datasets raise NotImplementedError

**File**: `lib/galaxy/workflow/run.py` (lines 515-517)

The ephemeral plan's Step 5 preserves this `NotImplementedError`. Per CWL spec, each
individual dataset should be wrapped in its own 1-element sub-list, producing a
`list:list` collection.

## What CWL `merge_nested` Means

Given N sources, `merge_nested` wraps each in a single-element array then concatenates:
- 1 File `A` -> `[A]` (File[])
- 2 Files `A, B` -> `[[A], [B]]` (File[][])
- 2 lists `[A,B], [C,D]` -> `[[A,B], [C,D]]` (already implemented)

## Code Changes (Post-Ephemeral World)

### 1. New adapter: `MergeNestedDatasetsAdapter`

**File**: `lib/galaxy/model/dataset_collections/adapters.py`

Bug 2 needs an adapter that wraps N individual HDAs into `list:list` where each HDA
becomes a 1-element sub-list. Not covered by existing adapters:
- `MergeDatasetsAdapter` produces flat `list` — wrong structure
- `MergeListsNestedAdapter` takes HDCAs as input — wrong input type

```python
class MergeNestedDatasetsAdapter(CollectionAdapter):
    """Wrap multiple individual datasets into list:list.

    CWL merge_nested for File inputs: [A, B] -> [[A], [B]]
    """

    def __init__(self, datasets: list["HistoryDatasetAssociation"]):
        self._datasets = datasets

    @property
    def collection_type(self) -> str:
        return "list:list"

    @property
    def elements(self):
        result = []
        for i, hda in enumerate(self._datasets):
            inner_element = TransientCollectionAdapterDatasetInstanceElement("0", hda)
            result.append(TransientCollectionAdapterSubListElement(str(i), [inner_element]))
        return result

    @property
    def dataset_instances(self):
        return list(self._datasets)

    @property
    def adapting(self):
        return self._datasets

    def to_adapter_model(self):
        return AdaptedDataCollectionMergeNestedDatasetsRequestInternal(
            src="CollectionAdapter",
            adapter_type="MergeNestedDatasets",
            adapting=[DataRequestInternalHda(src="hda", id=hda.id)
                      for hda in self._datasets],
        )
```

Also needs a new transient element for virtual sub-lists:

```python
class TransientCollectionAdapterSubListElement:
    """Virtual sub-list collection element containing transient dataset elements."""

    def __init__(self, element_identifier: str,
                 elements: list[TransientCollectionAdapterDatasetInstanceElement]):
        self.element_identifier = element_identifier
        self._elements = elements

    @property
    def child_collection(self):
        return self

    @property
    def element_object(self):
        return self

    @property
    def is_collection(self):
        return True

    @property
    def elements(self):
        return self._elements

    @property
    def collection_type(self):
        return "list"

    @property
    def dataset_instances(self):
        return [e.dataset_instance for e in self._elements]
```

### 2. Handle `merge_nested` with single connection

**File**: `lib/galaxy/workflow/run.py`, single-connection branch (~line 475)

Reuse existing adapters with a single-element list:

```python
if len(connections) == 1:
    replacement = self.replacement_for_connection(connections[0], is_data=is_data)
    if merge_type == "merge_nested" and is_data and hasattr(replacement, 'history_content_type'):
        if replacement.history_content_type == "dataset":
            return MergeDatasetsAdapter([replacement])  # wraps HDA in 1-element list
        elif replacement.history_content_type == "dataset_collection":
            return MergeListsNestedAdapter(
                [replacement], replacement.collection.collection_type
            )
    return replacement
```

No new adapter needed for single-connection — `MergeDatasetsAdapter([hda])` produces
a `list` with one element identified as `"0"`, which is correct merge_nested semantics.

### 3. Handle `merge_nested` for multiple individual datasets

**File**: `lib/galaxy/workflow/run.py`, multi-connection merge path

Replace `raise NotImplementedError()` with the new adapter:

```python
if input_collection_type is None:
    if merge_type == "merge_nested":
        return MergeNestedDatasetsAdapter(inputs)
    return MergeDatasetsAdapter(inputs)
```

### 4. Improve error for non-list collection types

**File**: `lib/galaxy/workflow/run.py` (~line 550-551)

```python
raise NotImplementedError(
    f"merge_{merge_type} not implemented for collection type '{input_collection_type}'"
)
```

### 5. Pydantic models

**File**: `lib/galaxy/tool_util_models/parameters.py`

```python
class AdaptedDataCollectionMergeNestedDatasetsRequestInternal(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeNestedDatasets"]
    adapting: list[DataRequestInternalHda]

class AdaptedDataCollectionMergeNestedDatasetsRequest(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeNestedDatasets"]
    adapting: list[DataRequestHda]
```

Add to both discriminated unions.

### 6. Recovery support

**File**: `lib/galaxy/model/dataset_collections/adapters.py`, `recover_adapter()`

```python
elif adapter_type == "MergeNestedDatasets":
    return MergeNestedDatasetsAdapter(wrapped_object)
```

### 7. CWL materialization

The `_persist_adapter_as_hdca()` helper (ephemeral Step 5b-i) must handle
`TransientCollectionAdapterSubListElement` when building real `DatasetCollection`
objects. When iterating adapter elements, if an element `is_collection`, recursively
create a `DatasetCollection` from its child elements.

### 8. Remove from RED_TESTS

**File**: `scripts/cwl_conformance_to_test_cases.py`

Remove `wf_wc_nomultiple_merge_nested` from v1.2 RED_TESTS.

## Testing Strategy

1. Run `wf_wc_nomultiple_merge_nested` (v1.2) to confirm current error — RED
2. Apply Change 2 (single-connection merge_nested) — should fix this test
3. Re-run — GREEN
4. Regression check: `wf_wc_nomultiple` and other merge-related passing tests

Change 3 (multi-dataset merge_nested) has no conformance test. Consider a unit test
with `source: [file1, file2]` + `linkMerge: merge_nested`. Lower priority.

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/adapters.py` | Add `MergeNestedDatasetsAdapter`, `TransientCollectionAdapterSubListElement`, update `recover_adapter()` |
| `lib/galaxy/workflow/run.py` | `replacement_for_input_connections`: single + multi connection merge_nested |
| `lib/galaxy/tool_util_models/parameters.py` | Pydantic models for MergeNestedDatasets |
| `lib/galaxy/workflow/modules.py` | `_persist_adapter_as_hdca()` must handle sub-list elements |
| `scripts/cwl_conformance_to_test_cases.py` | Remove 1 test from RED_TESTS |

## Unresolved Questions

1. Should `MergeNestedDatasetsAdapter.adapting` return raw HDAs or TransientElements?
   `MergeDatasetsAdapter.adapting` returns TransientElements. Normalize or handle both
   in job recording code?
2. `_persist_adapter_as_hdca()` recursive sub-collection creation — generic tree walk
   of `.elements` or case-specific per adapter type?
3. Single-connection merge_nested on an HDCA (list → list:list) — does any CWL test
   exercise this? Implement speculatively or defer?
4. Should Gap6 be folded into the ephemeral plan as a single PR, or a follow-up?
   Folding avoids shipping the `NotImplementedError` in the adapter code.
