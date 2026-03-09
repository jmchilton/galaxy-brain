# Plan: Replace EphemeralCollections with CollectionAdapters

## Goal

Replace the `EphemeralCollection` class and its associated duck-typed detection
pattern (`getattr(x, "ephemeral", False)` + `persistent_object`) with proper
`CollectionAdapter` subclasses that follow Galaxy's established adapter
serialization/recovery pipeline.

## Background

**EphemeralCollection** (`workflow/modules.py:3072-3097`) is a workflow-only
mechanism that dynamically merges multiple step outputs into a single collection
input. It wraps an in-memory `DatasetCollection` + lazily-persisted HDCA. It's
detected via `ephemeral = True` flag and unwrapped at 6 consumption points.

**CollectionAdapters** (`dataset_collections/adapters.py`) are a newer, more
principled framework for wrapping model objects into collection-like facades.
They have proper serialization (Pydantic models), DB persistence (adapter JSON
columns on job input tables), and recovery (`recover_adapter()`). Currently they
handle only promote/reshape operations, not merging.

The two concepts solve similar problems with different patterns. Unifying them
eliminates the ad-hoc duck typing, gives merge operations proper persistence
for job provenance, and simplifies the consumption code.

---

## Merge Strategies to Support

Three merge paths exist in `run.py:466-557`:

| Path | Input | merge_type | Result collection_type | Description |
|------|-------|-----------|----------------------|-------------|
| A | Multiple HDAs | default | `list` | Promote N datasets to a list |
| B | Multiple `list` HDCAs | `merge_flattened` | `list` | Flatten all list elements into one list |
| C | Multiple `list` HDCAs | `merge_nested` | `list:<input_type>` | Nest input lists as sub-collections |
| D | Multiple HDAs | `merge_nested` | `list:list` | Wrap each HDA in a sub-list (PLAN_GAP6) |

Note: Single-connection + `merge_nested` is a degenerate case of A/C (1-element list).

---

## Step 1: New Adapter Classes

**File:** `lib/galaxy/model/dataset_collections/adapters.py`

### 1a. `TransientCollectionAdapterCollectionElement`

New helper alongside existing `TransientCollectionAdapterDatasetInstanceElement`.
Wraps an HDCA (or its inner DatasetCollection) as a collection element:

```python
class TransientCollectionAdapterCollectionElement:
    def __init__(self, element_identifier: str, hdca: "HistoryDatasetCollectionAssociation"):
        self.element_identifier = element_identifier
        self._hdca = hdca

    @property
    def child_collection(self):
        return self._hdca.collection

    @property
    def element_object(self):
        return self._hdca.collection

    @property
    def dataset_instance(self):
        return None

    @property
    def is_collection(self):
        return True

    @property
    def columns(self):
        return None
```

### 1b. `MergeDatasetsAdapter`

Replaces Path A (multiple HDAs → list).

```python
class MergeDatasetsAdapter(CollectionAdapter):
    """Merge multiple datasets into a list collection."""

    def __init__(self, datasets: list["HistoryDatasetAssociation"]):
        self._datasets = datasets
        self._elements = [
            TransientCollectionAdapterDatasetInstanceElement(str(i), hda)
            for i, hda in enumerate(datasets)
        ]

    @property
    def collection_type(self) -> str:
        return "list"

    @property
    def elements(self):
        return self._elements

    @property
    def dataset_instances(self):
        return list(self._datasets)

    @property
    def dataset_action_tuples(self):
        # Aggregate from all HDAs
        ...

    @property
    def dataset_states_and_extensions_summary(self):
        # Aggregate from all HDAs
        ...

    @property
    def adapting(self):
        return self._elements  # list → matches existing list-adapting recording path

    def to_adapter_model(self):
        return AdaptedDataCollectionMergeDatasetsRequestInternal(
            src="CollectionAdapter",
            adapter_type="MergeDatasets",
            adapting=[DataRequestInternalHda(src="hda", id=hda.id)
                      for hda in self._datasets],
        )
```

### 1c. `MergeListsFlattenedAdapter`

Replaces Path B (multiple list HDCAs → single flat list).

```python
class MergeListsFlattenedAdapter(CollectionAdapter):
    """Flatten multiple list collections into one list."""

    def __init__(self, hdcas: list["HistoryDatasetCollectionAssociation"]):
        self._hdcas = hdcas

    @property
    def collection_type(self) -> str:
        return "list"

    @property
    def elements(self):
        result = []
        idx = 0
        for hdca in self._hdcas:
            for elem in hdca.collection.elements:
                result.append(TransientCollectionAdapterDatasetInstanceElement(
                    str(idx), elem.dataset_instance
                ))
                idx += 1
        return result

    @property
    def dataset_instances(self):
        instances = []
        for hdca in self._hdcas:
            instances.extend(hdca.dataset_instances)
        return instances

    @property
    def adapting(self):
        return self._hdcas

    def to_adapter_model(self):
        return AdaptedDataCollectionMergeListsFlattenedRequestInternal(
            src="CollectionAdapter",
            adapter_type="MergeListsFlattened",
            adapting=[DataRequestInternalHdca(src="hdca", id=hdca.id)
                      for hdca in self._hdcas],
        )
```

### 1d. `MergeListsNestedAdapter`

Replaces Path C (multiple list HDCAs → list:list).

```python
class MergeListsNestedAdapter(CollectionAdapter):
    """Nest multiple list collections as sub-collections."""

    def __init__(self, hdcas: list["HistoryDatasetCollectionAssociation"],
                 input_collection_type: str):
        self._hdcas = hdcas
        self._input_collection_type = input_collection_type

    @property
    def collection_type(self) -> str:
        return f"list:{self._input_collection_type}"

    @property
    def elements(self):
        return [TransientCollectionAdapterCollectionElement(str(i), hdca)
                for i, hdca in enumerate(self._hdcas)]

    @property
    def dataset_instances(self):
        instances = []
        for hdca in self._hdcas:
            instances.extend(hdca.dataset_instances)
        return instances

    @property
    def adapting(self):
        return self._hdcas

    def to_adapter_model(self):
        return AdaptedDataCollectionMergeListsNestedRequestInternal(
            src="CollectionAdapter",
            adapter_type="MergeListsNested",
            input_collection_type=self._input_collection_type,
            adapting=[DataRequestInternalHdca(src="hdca", id=hdca.id)
                      for hdca in self._hdcas],
        )
```

### 1e. `TransientCollectionAdapterSubListElement` (for PLAN_GAP6)

Virtual sub-list element containing transient dataset elements. Unlike
`TransientCollectionAdapterCollectionElement` (wraps a real HDCA), this wraps
a list of `TransientCollectionAdapterDatasetInstanceElement` to represent a
sub-list with no backing HDCA — needed for merge_nested of individual HDAs.

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

### 1f. `MergeNestedDatasetsAdapter` (for PLAN_GAP6)

Replaces Path D (multiple HDAs → list:list, each HDA in own sub-list).

```python
class MergeNestedDatasetsAdapter(CollectionAdapter):
    """Wrap multiple individual datasets into list:list."""

    def __init__(self, datasets: list["HistoryDatasetAssociation"]):
        self._datasets = datasets

    @property
    def collection_type(self) -> str:
        return "list:list"

    @property
    def elements(self):
        result = []
        for i, hda in enumerate(self._datasets):
            inner = TransientCollectionAdapterDatasetInstanceElement("0", hda)
            result.append(TransientCollectionAdapterSubListElement(str(i), [inner]))
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

---

## Step 2: Pydantic Serialization Models

**File:** `lib/galaxy/tool_util_models/parameters.py`

### Internal models (DB-facing, int IDs):

```python
class AdaptedDataCollectionMergeDatasetsRequestInternal(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeDatasets"]
    adapting: list[DataRequestInternalHda]

class AdaptedDataCollectionMergeListsFlattenedRequestInternal(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeListsFlattened"]
    adapting: list[DataRequestInternalHdca]

class AdaptedDataCollectionMergeListsNestedRequestInternal(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeListsNested"]
    input_collection_type: str
    adapting: list[DataRequestInternalHdca]

class AdaptedDataCollectionMergeNestedDatasetsRequestInternal(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeNestedDatasets"]
    adapting: list[DataRequestInternalHda]
```

### External models (API-facing, string IDs):

```python
class AdaptedDataCollectionMergeDatasetsRequest(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeDatasets"]
    adapting: list[DataRequestHda]

class AdaptedDataCollectionMergeListsFlattenedRequest(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeListsFlattened"]
    adapting: list[DataRequestHdca]

class AdaptedDataCollectionMergeListsNestedRequest(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeListsNested"]
    input_collection_type: str
    adapting: list[DataRequestHdca]

class AdaptedDataCollectionMergeNestedDatasetsRequest(AdaptedDataCollectionRequestBase):
    adapter_type: Literal["MergeNestedDatasets"]
    adapting: list[DataRequestHda]
```

### Update discriminated unions:

Add new models to both `AdaptedDataCollectionRequest` and
`AdaptedDataCollectionRequestInternal` unions, discriminated on `adapter_type`.

---

## Step 3: Recovery Support

**File:** `lib/galaxy/model/dataset_collections/adapters.py`

### 3a. Update `recover_adapter()`

Add branches for new adapter types. The `wrapped_object` parameter needs to
handle list-of-HDAs and list-of-HDCAs:

```python
def recover_adapter(wrapped_object, adapter_model):
    adapter_type = adapter_model.adapter_type
    if adapter_type == "PromoteCollectionElementToCollection":
        return PromoteCollectionElementToCollectionAdapter(wrapped_object)
    elif adapter_type == "PromoteDatasetToCollection":
        return PromoteDatasetToCollection(wrapped_object, adapter_model.collection_type)
    elif adapter_type == "PromoteDatasetsToCollection":
        return PromoteDatasetsToCollection(wrapped_object, adapter_model.collection_type)
    elif adapter_type == "MergeDatasets":
        return MergeDatasetsAdapter(wrapped_object)  # list[HDA]
    elif adapter_type == "MergeListsFlattened":
        return MergeListsFlattenedAdapter(wrapped_object)  # list[HDCA]
    elif adapter_type == "MergeListsNested":
        return MergeListsNestedAdapter(wrapped_object, adapter_model.input_collection_type)
    elif adapter_type == "MergeNestedDatasets":
        return MergeNestedDatasetsAdapter(wrapped_object)  # list[HDA]
    else:
        raise Exception(f"Unknown collection adapter encountered {adapter_type}")
```

### 3b. Update `src_id_to_item()` in `tools/parameters/basic.py`

The existing recovery in `src_id_to_item()` handles lists of
`TransientCollectionAdapterDatasetInstanceElement` (for PromoteDatasetsToCollection).
New merge adapters need recovery from lists of HDAs or HDCAs:

```python
if isinstance(adapting, list):
    items = []
    for item in adapting:
        item_dict = item.dict() if hasattr(item, 'dict') else item.model_dump()
        if hasattr(item, 'name'):
            # existing TransientElement path for PromoteDatasetsToCollection
            element = TransientCollectionAdapterDatasetInstanceElement(
                item.name,
                cast(HDA, src_id_to_item(sa_session, item_dict, security)),
            )
            items.append(element)
        else:
            # new path: fetch raw HDA or HDCA
            items.append(src_id_to_item(sa_session, item_dict, security))
    return recover_adapter(items, adapter_model)
```

---

## Step 4: Job Input Recording

**File:** `lib/galaxy/tools/actions/__init__.py`

The existing CollectionAdapter recording logic (lines ~1039-1056) handles:
- `adapting` is `DatasetCollectionElement` → `add_input_dataset_collection_element()`
- `adapting` is `HistoryDatasetAssociation` → `add_input_dataset()`
- `adapting` is `list` → iterate, `add_input_dataset()` per element

For merge adapters, `adapting` is a list. Two sub-cases:

1. **MergeDatasets**: `adapting` is `list[TransientElement]` → existing list branch
   works (each element has `.element_identifier` and `.hda`)

2. **MergeNestedDatasets**: `adapting` is `list[HDA]` (raw HDAs, not TransientElements)
   → same list branch but handle raw HDA type alongside TransientElement.

3. **MergeFlattened/MergeNested**: `adapting` is `list[HDCA]` → need new sub-branch:

```python
elif isinstance(adapting, list):
    adapter_model_dump = adapter_model.model_dump()
    for i, element in enumerate(adapting):
        if isinstance(element, TransientCollectionAdapterDatasetInstanceElement):
            input_key = f"{name}|__adapter_part__|{element.element_identifier}"
            job.add_input_dataset(input_key, dataset=element.hda)
        elif isinstance(element, model.HistoryDatasetAssociation):
            # MergeNestedDatasets: raw HDAs
            input_key = f"{name}|__adapter_part__|{i}"
            job.add_input_dataset(input_key, dataset=element)
        elif isinstance(element, model.HistoryDatasetCollectionAssociation):
            input_key = f"{name}|__adapter_part__|{i}"
            job.add_input_dataset_collection(
                input_key, element,
                adapter_json=adapter_model_dump if i == 0 else None,
            )
```

Store the adapter JSON on the first input association only; recovery reads it
from whichever association carries it.

---

## Step 5: Replace Creation Site

**File:** `lib/galaxy/workflow/run.py`

Replace `replacement_for_input_connections()` lines 511-557. Instead of building
a `DatasetCollection` + `DatasetCollectionElement` objects in memory and wrapping
in `EphemeralCollection`, create the appropriate adapter:

**Single-connection path** (`len(connections) == 1`): Add merge_nested handling
before the existing `return replacement`:

```python
if len(connections) == 1:
    replacement = self.replacement_for_connection(connections[0], is_data=is_data)
    if merge_type == "merge_nested" and is_data and hasattr(replacement, 'history_content_type'):
        if replacement.history_content_type == "dataset":
            return MergeDatasetsAdapter([replacement])  # 1-element list
        elif replacement.history_content_type == "dataset_collection":
            return MergeListsNestedAdapter(
                [replacement], replacement.collection.collection_type)
    return replacement
```

**Multi-connection path**: Replace EphemeralCollection creation with adapters:

```python
if input_collection_type is None:
    if merge_type == "merge_nested":
        # Path D: wrap each HDA in sub-list -> list:list (PLAN_GAP6)
        return MergeNestedDatasetsAdapter(inputs)
    # Path A: merge datasets into flat list
    return MergeDatasetsAdapter(inputs)

elif input_collection_type == "list":
    if merge_type == "merge_flattened":
        # Path B: flatten lists
        return MergeListsFlattenedAdapter(inputs)
    elif merge_type == "merge_nested":
        # Path C: nest lists
        return MergeListsNestedAdapter(inputs, input_collection_type)
    else:
        # default for lists = flatten (existing behavior)
        return MergeListsFlattenedAdapter(inputs)
else:
    raise NotImplementedError(
        f"merge_{merge_type} not implemented for collection type '{input_collection_type}'"
    )
```

**Note:** `inputs` here are the replacement objects from
`replacement_for_connection()`. For Path A these are HDAs; for Paths B/C these
are HDCAs. Need to verify the actual types returned by
`replacement_for_connection()` — they may be HDAs or HDCAs depending on the
upstream step output type.

---

## Step 5b: Replace CWL-Path EphemeralCollection Sites

The CWL code path has two additional EphemeralCollection consumption sites that
are distinct from the merge-adapter creation in `replacement_for_input_connections()`.

### 5b-i. `build_cwl_input_dict()` — adapter materialization (modules.py ~line 294)

**Current:**
```python
if isinstance(replacement, EphemeralCollection):
    session = get_object_session(step)
    session.add(replacement.persistent_object)
    session.flush()

cwl_input_dict[input_name] = _galaxy_to_cwl_ref(replacement)
```

**Replace with:** When a `CollectionAdapter` is returned from
`replacement_for_input_connections()`, materialize it as a real HDCA. The CWL
scatter path (`find_cwl_scatter_collections`) needs real HDCA IDs to load
collections from the DB via `trans.sa_session.get(HDCA, ref["id"])`.

```python
if isinstance(replacement, CollectionAdapter):
    hdca = _persist_adapter_as_hdca(replacement, step, progress)
    cwl_input_dict[input_name] = _galaxy_to_cwl_ref(hdca)
```

Where `_persist_adapter_as_hdca` builds a `HistoryDatasetCollectionAssociation`
from the adapter's elements/collection_type, adds to session, and flushes.

**Constraint**: This materialization MUST happen before
`find_cwl_scatter_collections()` runs, since scatter detection loads HDCAs by ID.

**Shared utility**: The HDCA-from-DatasetCollection creation pattern here is also
used by `_build_flat_crossproduct_hdcas()` (PLAN_GAP1) and the subcollection
wrapping in Step 5b-iii. Consider factoring into a small shared helper:
```python
def _create_hdca_for_collection(dc, history, sa_session):
    hdca = model.HistoryDatasetCollectionAssociation(collection=dc, history=history)
    sa_session.add(hdca)
    sa_session.flush()
    return hdca
```

**Sub-list materialization** (PLAN_GAP6): When `_persist_adapter_as_hdca()` encounters
a `MergeNestedDatasetsAdapter`, its elements are `TransientCollectionAdapterSubListElement`
objects. The helper must recursively build real `DatasetCollection` +
`DatasetCollectionElement` objects from each sub-list's child elements. Generic approach:
when iterating adapter elements, if `element.is_collection`, create a child
`DatasetCollection` from `element.elements` and wrap in a `DatasetCollectionElement`.

### 5b-ii. `_galaxy_to_cwl_ref()` — adapter branch (modules.py ~line 339)

**Current:**
```python
elif isinstance(value, EphemeralCollection):
    return {"src": "hdca", "id": value.persistent_object.id}
```

**Replace:** Remove this branch. With Step 5b-i materializing adapters into HDCAs
in `build_cwl_input_dict()`, `_galaxy_to_cwl_ref()` always receives real HDCA
objects — the standard HDCA branch handles them.

### 5b-iii. Scatter iteration loop — subcollection wrapping (modules.py ~line 2784)

**Current:**
```python
ephemeral = EphemeralCollection(
    collection=obj,
    history=invocation.history,
)
sa_session.add(ephemeral.persistent_object)
sa_session.flush()
obj = ephemeral
```

This wraps a bare `DatasetCollection` (subcollection element from scatter over
nested collections like `list:list`) into an HDCA for ID-based referencing. This
is NOT a merge operation.

**Replace with direct HDCA creation** (no adapter needed):
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

---

## Step 6: Remove Ephemeral Consumption Points

Replace all `getattr(x, "ephemeral", False)` checks and `persistent_object`
references. These are already handled for CollectionAdapters via `isinstance(x,
CollectionAdapter)` in most places.

### 6a. `tools/parameters/basic.py:1932-1938` — `to_json()`

**Current:**
```python
if getattr(value, "ephemeral", False):
    value = value.persistent_object
    if value.id is None:
        app.model.context.add(value)
        app.model.context.flush()
```

**Replace:** Remove this block entirely. CollectionAdapters don't need to be
persisted as HDCAs — they're serialized as adapter JSON instead. The
`to_json()` method should handle CollectionAdapters via the existing adapter
serialization path. If CollectionAdapter doesn't already have a `to_json()`
handler here, add one that calls `to_adapter_model().model_dump()`.

### 6b. `tools/actions/__init__.py:1031-1032` — job input recording

**Current:**
```python
if getattr(dataset_collection, "ephemeral", False):
    dataset_collection = dataset_collection.persistent_object
```

**Replace:** Remove. CollectionAdapters already flow into the `isinstance(x,
CollectionAdapter)` branch at line ~1039.

### 6c. `managers/collections.py:272-280` — implicit input recording

**Current:**
```python
if getattr(input_collection, "ephemeral", False):
    input_collection = input_collection.persistent_object
```

**Replace:** Check `isinstance(input_collection, CollectionAdapter)`. For merge
adapters that wrap HDCAs, extract the underlying HDCAs and record each. For
adapters that wrap HDAs, skip (no collection-level implicit input). Or simply
skip recording for all adapters (matching existing ephemeral behavior where
`implicit_inputs` returns `[]`).

### 6d. `managers/collections.py:444-446` — tag propagation

**Current:**
```python
if getattr(v, "ephemeral", False):
    v = v.persistent_object
for tag in v.auto_propagated_tags:
```

**Replace:** Add `auto_propagated_tags` property to `CollectionAdapter` base
class that aggregates tags from all adapted objects:

```python
@property
def auto_propagated_tags(self):
    tags = []
    for instance in self.dataset_instances:
        tags.extend(instance.auto_propagated_tags)
    return tags
```

### 6e. `model/__init__.py:10240` — workflow output recording

**Current:**
```python
if getattr(output_object, "ephemeral", False):
    return  # Don't record ephemeral collections as step outputs
```

**Replace:**
```python
if isinstance(output_object, CollectionAdapter):
    return  # Don't record adapter collections as step outputs
```

### 6f. `matching.py:23` — ephemeral detection

**Current:**
```python
self.uses_ephemeral_collections = self.uses_ephemeral_collections or not hasattr(hdca, "hid")
```

**No change needed.** CollectionAdapter subclasses also lack `hid`, so the
existing detection mechanism works. Rename the flag to
`uses_non_persisted_collections` for clarity (optional).

### 6g. `matching.py:104-108` — implicit_inputs

**No change needed.** Flag-based logic still applies.

### 6h. `execute.py:467-473` — on_text generation

**No change needed.** Flag-based logic still applies.

---

## Step 7: Delete EphemeralCollection

**File:** `lib/galaxy/workflow/modules.py`

Delete the `EphemeralCollection` class (lines 3072-3097) and its import in
`run.py`.

---

## Step 8: Update Type Hints & Imports

- Remove `EphemeralCollection` from any union types or parameter annotations
- Add `CollectionAdapter` imports where merge adapters are created (run.py)
- Update type hints in consumption points if they referenced
  `EphemeralCollection`

---

## Testing Strategy

### Conformance Tests (Primary)

The CWL conformance tests are the primary validation. No existing collection
adapters (`PromoteDatasetToCollection`, etc.) have unit tests — they're
validated through integration tests only. Follow the same pattern here.

These conformance tests exercise all three merge paths:

| Test ID | Merge Path | Status Check |
|---------|-----------|--------------|
| `wf_wc_scatter_multiple_merge` | A (default) | Must pass |
| `wf_wc_scatter_multiple_flattened` | B (flatten) | Must pass |
| `wf_wc_scatter_multiple_nested` | C (nested) | Must pass |
| `wf_scatter_twopar_oneinput_flattenedmerge` | B (flatten with list inputs) | Must pass |
| `scatter_multi_input_embedded_subworkflow` | A (default, subworkflow) | Must pass |
| `valuefrom_wf_step_multiple` | multiple sources | Must pass |
| `wf_multiplesources_multipletypes` | mixed types | Must pass |
| `wf_wc_nomultiple_merge_nested` | D (merge_nested HDAs) | Must pass (was RED — PLAN_GAP6) |

### Scatter Regression Tests

The CWL scatter code path creates and consumes EphemeralCollections differently
from the merge path. Include these in the regression suite:

| Test ID | Why |
|---------|-----|
| `scatter_wf1` through `scatter_wf4` | Basic scatter (no subcollection wrapping) |
| `scatter_valuefrom*` | Scatter + valueFrom interaction |
| Any nested-collection scatter tests | Exercise line-2784 subcollection wrapping path |

### Development Order

1. Implement adapter classes + Pydantic models + recovery (Steps 1-3)
2. Implement job recording changes (Step 4)
3. Replace creation site in `run.py` (Step 5)
4. Update consumption points (Step 6)
5. Delete `EphemeralCollection` (Step 7)
6. Run conformance tests to validate

---

## Files Modified

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/adapters.py` | Add 4 adapter classes + 2 helpers + update `recover_adapter()` |
| `lib/galaxy/tool_util_models/parameters.py` | Add 8 Pydantic models (4 internal + 4 external) + update unions |
| `lib/galaxy/workflow/run.py` | Replace EphemeralCollection creation with adapter creation |
| `lib/galaxy/tools/parameters/basic.py` | Remove ephemeral check in `to_json()`, update `src_id_to_item()` recovery |
| `lib/galaxy/tools/actions/__init__.py` | Remove ephemeral check, extend list-adapting recording for HDCAs |
| `lib/galaxy/managers/collections.py` | Replace ephemeral checks with `isinstance(CollectionAdapter)` |
| `lib/galaxy/model/__init__.py` | Replace ephemeral check with `isinstance(CollectionAdapter)` |
| `lib/galaxy/workflow/modules.py` | Delete `EphemeralCollection` class; update `build_cwl_input_dict()` (Step 5b-i), `_galaxy_to_cwl_ref()` (Step 5b-ii), scatter iteration loop (Step 5b-iii) |

**No changes needed:**
- `matching.py` — `not hasattr(hid)` detection still works
- `execute.py` — `uses_ephemeral_collections` flag logic still works

---

## Risks & Considerations

0. **CWL scatter depends on real HDCA IDs** — `find_cwl_scatter_collections()`
   loads collections from DB via `trans.sa_session.get(HDCA, ref["id"])`. Merge
   adapters flowing through the CWL code path MUST be materialized into real,
   flushed HDCAs in `build_cwl_input_dict()` (Step 5b-i) before scatter detection
   runs. This is a hard constraint — adapters cannot flow lazily through the CWL
   scatter path.

1. **`replacement_for_connection()` return types** — need to verify what types
   are actually returned. For datasets it may return HDA directly or something
   wrapped. For collections it may return HDCA or an `EphemeralCollection` from
   a prior merge. Need to handle the case where a merge adapter feeds into
   another merge.

2. **Default merge for lists** — the current code's default path (no explicit
   merge_type) for list inputs falls through to the flatten branch via the
   `elif input_collection_type == "list":` block without checking merge_type
   explicitly. Need to preserve this behavior.

3. **DB migration** — adapter JSON columns already exist on all three job input
   tables. No schema migration needed; new adapter_type values will just appear
   in the JSON.

4. **CollectionAdapter in parameter matching** — the matching code in
   `matching.py` currently handles CollectionAdapters by duck typing (checking
   elements, collection_type). Merge adapters need to satisfy the same
   interface. The `TransientCollectionAdapterCollectionElement` helper is needed
   for nested merge to provide proper `child_collection`.

---

## Unresolved Questions

- The `inputs` passed to merge adapters from `replacement_for_connection()` —
  are they always raw HDA/HDCA objects, or could they be other wrapper types?
- Should merge adapters be exclusively workflow-internal, or could they also be
  useful for API requests (e.g., user sends multiple HDCAs to be merged)?
- The `to_json()` path in `basic.py` — how exactly should a CollectionAdapter
  serialize? Existing adapters go through `from_json()`/`to_json()` differently
  than ephemeral collections. Need to verify the exact code path a merge
  adapter takes through parameter serialization.
- Should we rename `uses_ephemeral_collections` flag in matching.py to
  something more generic (e.g. `uses_adapter_collections`)?
- Tag propagation for merge adapters wrapping HDCAs — should tags come from
  the HDCA level or the individual dataset level?
