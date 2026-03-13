# Plan: Replace EphemeralCollections with CollectionAdapters

## Goal

Replace the `EphemeralCollection` class and its associated duck-typed detection
pattern (`getattr(x, "ephemeral", False)` + `persistent_object`) with proper
`CollectionAdapter` subclasses that follow Galaxy's established adapter
serialization/recovery pipeline.

## Background

**EphemeralCollection** (`workflow/modules.py:3594-3621`) is a workflow-only
mechanism that dynamically merges multiple step outputs into a single collection
input. It wraps an in-memory `DatasetCollection` + lazily-persisted HDCA. It's
detected via `ephemeral = True` flag and unwrapped at multiple consumption points.

**CollectionAdapters** (`dataset_collections/adapters.py`) are a newer, more
principled framework for wrapping model objects into collection-like facades.
They have proper serialization (Pydantic models), DB persistence (adapter JSON
columns on job input tables), and recovery (`recover_adapter()`). Currently they
handle only promote/reshape operations, not merging.

The two concepts solve similar problems with different patterns. Unifying them
eliminates the ad-hoc duck typing, gives merge operations proper persistence
for job provenance, and simplifies the consumption code.

**PickValueModule** (`workflow/modules.py:2260-2565`) is a recently added
synthetic workflow module that implements CWL `pickValue` semantics. It creates
HDCAs via `dataset_collection_manager.create()` (for `all_non_null` mode) and
handles multi-source merge via `_execute_on_merged_collections()`. It does NOT
use `EphemeralCollection` — it creates real persisted HDCAs directly. However,
its inputs may be `EphemeralCollection` objects when upstream merge logic
produces them, so it is an indirect consumer.

---

## Current EphemeralCollection Usage Inventory

### Creation sites (2):

| Site | File:Line | Description |
|------|-----------|-------------|
| C1 | `run.py:553` | Multi-connection merge in `replacement_for_input_connections()` |
| C2 | `modules.py:3113` | Scatter subcollection wrapping (bare DC → HDCA) |

### Consumption sites (8):

| Site | File:Line | Pattern | Description |
|------|-----------|---------|-------------|
| E1 | `modules.py:295` | `isinstance(replacement, EphemeralCollection)` | `build_cwl_input_dict()` — flush persistent HDCA for CWL |
| E2 | `modules.py:340` | `isinstance(value, EphemeralCollection)` | `_galaxy_to_cwl_ref()` — convert to `{"src":"hdca","id":...}` |
| E3 | `run.py:760` | `isinstance(content, modules.EphemeralCollection)` | `set_step_outputs()` — unwrap for `invocation.add_input()` |
| E4 | `run.py:933` | `isinstance(replacement, modules.EphemeralCollection)` | `subworkflow_progress()` — flush for downstream subworkflow refs |
| E5 | `basic.py:1932` | `getattr(value, "ephemeral", False)` | `to_json()` — persist before serialization |
| E6 | `actions/__init__.py:1056` | `getattr(dataset_collection, "ephemeral", False)` | Job input recording — unwrap to HDCA |
| E7 | `managers/collections.py:274` | `getattr(input_collection, "ephemeral", False)` | Implicit input recording |
| E8 | `managers/collections.py:445` | `getattr(v, "ephemeral", False)` | Tag propagation |

### Indirect ephemeral flag references (3):

| Site | File:Line | Pattern | Description |
|------|-----------|---------|-------------|
| F1 | `model/__init__.py:10287` | `getattr(output_object, "ephemeral", False)` | `add_output()` — skip recording ephemeral as step outputs |
| F2 | `matching.py:22,25,62,125,137` | `uses_ephemeral_collections` | Flag-based detection via `not hasattr(hdca, "hid")` |
| F3 | `execute.py:470` | `uses_ephemeral_collections` | `on_text` generation |

---

## Merge Strategies to Support

Three merge paths exist in `run.py:470-557`:

| Path | Input | merge_type | Result collection_type | Description |
|------|-------|-----------|----------------------|-------------|
| A | Multiple HDAs | default | `list` | Promote N datasets to a list |
| B | Multiple `list` HDCAs | `merge_flattened` | `list` | Flatten all list elements into one list |
| C | Multiple `list` HDCAs | `merge_nested` | `list:<input_type>` | Nest input lists as sub-collections |
| D | Multiple HDAs | `merge_nested` | — | Currently `raise NotImplementedError()` (run.py:517) |

Note: Path D (`merge_nested` of individual HDAs) is currently NOT implemented —
`run.py:517` raises `NotImplementedError`. The plan includes `MergeNestedDatasetsAdapter`
for future completeness but it's not required for parity. Single-connection +
`merge_nested` is a degenerate case of A/C (1-element list).

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

### 1e. `TransientCollectionAdapterSubListElement` (for future Path D)

Virtual sub-list element containing transient dataset elements. Unlike
`TransientCollectionAdapterCollectionElement` (wraps a real HDCA), this wraps
a list of `TransientCollectionAdapterDatasetInstanceElement` to represent a
sub-list with no backing HDCA — needed for merge_nested of individual HDAs.

**Note**: Not needed for parity — Path D currently raises `NotImplementedError`.
Include only if implementing Path D support as part of this work.

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

### 1f. `MergeNestedDatasetsAdapter` (for future Path D)

Replaces Path D (multiple HDAs → list:list, each HDA in own sub-list).

**Note**: Not needed for parity — currently `NotImplementedError`. Include only
if implementing Path D.

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

Add new models to both `AdaptedDataCollectionRequest` (line 1174) and
`AdaptedDataCollectionRequestInternal` (line 1205) unions, discriminated on
`adapter_type`.

**Note:** `DataRequestInternalHdca` may not exist yet in `parameters.py`. If
not, it must be created alongside `DataRequestInternalHda` (which does exist).

---

## Step 3: Recovery Support

**File:** `lib/galaxy/model/dataset_collections/adapters.py`

### 3a. Update `recover_adapter()` (currently at line 288)

Add branches for new adapter types:

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

The existing CollectionAdapter recording logic (lines ~1064-1083) handles:
- `adapting` is `DatasetCollectionElement` → `add_input_dataset_collection_element()`
- `adapting` is `HistoryDatasetAssociation` → `add_input_dataset()`
- `adapting` is `list` → iterate, `add_input_dataset()` per element (assumes
  each element is `TransientCollectionAdapterDatasetInstanceElement` with
  `.element_identifier` and `.hda`)

For merge adapters, `adapting` varies:

1. **MergeDatasetsAdapter**: `adapting` returns `self._elements` (list of
   `TransientCollectionAdapterDatasetInstanceElement`) → existing list branch
   works.

2. **MergeNestedDatasetsAdapter** (future): `adapting` returns `self._datasets`
   (list of raw HDAs) → existing list branch expects `.element_identifier` and
   `.hda`, so need to handle raw HDA type.

3. **MergeFlattened/MergeNested**: `adapting` returns `self._hdcas` (list of
   HDCAs) → need new sub-branch:

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

Replace `replacement_for_input_connections()` lines 510-556. Instead of building
a `DatasetCollection` + `DatasetCollectionElement` objects in memory and wrapping
in `EphemeralCollection`, create the appropriate adapter:

**Single-connection path** (`len(connections) == 1`, line 475): Add merge_nested
handling before the existing `return replacement` (currently at line 476, no
merge_type check):

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

**Multi-connection path** (lines 478-556): Replace the `DatasetCollection()` +
`DatasetCollectionElement()` construction + `EphemeralCollection()` wrapping:

```python
if input_collection_type is None:
    if merge_type == "merge_nested":
        # Path D: currently NotImplementedError — keep raising or implement
        raise NotImplementedError()
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
        f"merge not implemented for collection type '{input_collection_type}'"
    )
```

**Note:** `inputs` are the replacement objects from
`replacement_for_connection()`. For Path A these are HDAs; for Paths B/C these
are HDCAs. The type-checking loop (lines 481-503) already validates this.

---

## Step 5b: Replace CWL-Path EphemeralCollection Sites

The CWL code path has additional EphemeralCollection consumption sites distinct
from the merge-adapter creation in `replacement_for_input_connections()`.

### 5b-i. `build_cwl_input_dict()` — adapter materialization (modules.py line 294)

**Current (E1):**
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
used by the subcollection wrapping in Step 5b-iii. Consider factoring into a
small shared helper:
```python
def _create_hdca_for_collection(dc, history, sa_session):
    hdca = model.HistoryDatasetCollectionAssociation(collection=dc, history=history)
    sa_session.add(hdca)
    sa_session.flush()
    return hdca
```

**Sub-list materialization** (future Path D): When `_persist_adapter_as_hdca()`
encounters a `MergeNestedDatasetsAdapter`, its elements are
`TransientCollectionAdapterSubListElement` objects. The helper must recursively
build real `DatasetCollection` + `DatasetCollectionElement` objects from each
sub-list's child elements. Generic approach: when iterating adapter elements,
if `element.is_collection`, create a child `DatasetCollection` from
`element.elements` and wrap in a `DatasetCollectionElement`.

### 5b-ii. `_galaxy_to_cwl_ref()` — adapter branch (modules.py line 340)

**Current (E2):**
```python
elif isinstance(value, EphemeralCollection):
    return {"src": "hdca", "id": value.persistent_object.id}
```

**Replace:** Remove this branch. With Step 5b-i materializing adapters into HDCAs
in `build_cwl_input_dict()`, `_galaxy_to_cwl_ref()` always receives real HDCA
objects — the standard HDCA branch (line 334) handles them.

### 5b-iii. Scatter iteration loop — subcollection wrapping (modules.py line 3110)

**Current (C2):**
```python
if isinstance(obj, model.DatasetCollection):
    # Subcollection from scatter over nested collection (e.g. list:list).
    # Wrap in an HDCA so downstream code can reference it by ID.
    ephemeral = EphemeralCollection(
        collection=obj,
        history=invocation.history,
    )
    sa_session = get_object_session(step)
    sa_session.add(ephemeral.persistent_object)
    sa_session.flush()
    obj = ephemeral
slice_dict[name] = _galaxy_to_cwl_ref(obj)
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
    sa_session = get_object_session(step)
    sa_session.add(hdca)
    sa_session.flush()
    obj = hdca
slice_dict[name] = _galaxy_to_cwl_ref(obj)
```

### 5b-iv. `subworkflow_progress()` — flush for subworkflow refs (run.py line 932)

**Current (E4):**
```python
# Flush EphemeralCollection so it gets a DB id for downstream refs
if isinstance(replacement, modules.EphemeralCollection):
    self.trans.sa_session.add(replacement.persistent_object)
    self.trans.sa_session.flush()
subworkflow_inputs[subworkflow_step_id] = replacement
```

**Replace:** When `replacement_for_input_connections()` returns a
`CollectionAdapter`, materialize as HDCA before storing in subworkflow_inputs:

```python
if isinstance(replacement, CollectionAdapter):
    replacement = _persist_adapter_as_hdca(replacement, step, self)
subworkflow_inputs[subworkflow_step_id] = replacement
```

Or reuse the same `_persist_adapter_as_hdca()` helper from Step 5b-i (may need
to adjust parameters — the helper needs access to history + sa_session).

### 5b-v. `set_step_outputs()` — unwrap for invocation.add_input() (run.py line 759)

**Current (E3):**
```python
# Unwrap EphemeralCollection to its persistent HDCA for DB storage
if isinstance(content, modules.EphemeralCollection):
    content = content.persistent_object
invocation.add_input(content, step.id)
```

**Replace:** With merge adapters materialized to HDCAs at creation site (Step 5)
or in `build_cwl_input_dict()` (Step 5b-i), this code path should never see an
adapter. If defensiveness is desired:

```python
if isinstance(content, CollectionAdapter):
    # Should not happen — adapters materialized upstream
    raise AssertionError("CollectionAdapter should have been materialized before reaching set_step_outputs")
invocation.add_input(content, step.id)
```

---

## Step 6: Remove Ephemeral Consumption Points

Replace all `getattr(x, "ephemeral", False)` checks and `persistent_object`
references.

### 6a. `tools/parameters/basic.py:1932-1938` — `to_json()` (E5)

**Current:**
```python
if getattr(value, "ephemeral", False):
    # wf_wc_scatter_multiple_flattened
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

### 6b. `tools/actions/__init__.py:1056-1057` — job input recording (E6)

**Current:**
```python
if getattr(dataset_collection, "ephemeral", False):
    dataset_collection = dataset_collection.persistent_object
```

**Replace:** Remove. CollectionAdapters already flow into the `isinstance(x,
CollectionAdapter)` branch at line 1064.

### 6c. `managers/collections.py:274` — implicit input recording (E7)

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

### 6d. `managers/collections.py:445` — tag propagation (E8)

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

### 6e. `model/__init__.py:10287` — workflow output recording (F1)

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

### 6f. `matching.py:22,25` — ephemeral detection (F2)

**Current:**
```python
self.uses_ephemeral_collections = self.uses_ephemeral_collections or not hasattr(hdca, "hid")
```

**No change needed.** CollectionAdapter subclasses also lack `hid`, so the
existing detection mechanism works. Rename the flag to
`uses_non_persisted_collections` for clarity (optional).

### 6g. `matching.py:124-129` — implicit_inputs (F2)

**No change needed.** Flag-based logic still applies.

### 6h. `execute.py:470` — on_text generation (F3)

**No change needed.** Flag-based logic still applies.

---

## Step 7: Delete EphemeralCollection

**File:** `lib/galaxy/workflow/modules.py`

Delete the `EphemeralCollection` class (lines 3594-3621) and its import in
`run.py`.

---

## Step 8: Update Type Hints & Imports

- Remove `EphemeralCollection` from any union types or parameter annotations
- Add `CollectionAdapter` imports where merge adapters are created (run.py)
- Add merge adapter imports where needed (modules.py for `_persist_adapter_as_hdca`)
- Update type hints in consumption points if they referenced
  `EphemeralCollection`

---

## Interaction with PickValueModule

The `PickValueModule` (modules.py:2260-2565) is a recently added synthetic
workflow module for CWL `pickValue` semantics. Key interactions:

1. **Inputs**: `PickValueModule.execute()` receives replacements via
   `progress.replacement_for_input()` which calls
   `replacement_for_input_connections()`. If the upstream step produces a merge,
   the replacement could be an `EphemeralCollection` (currently) or a
   `CollectionAdapter` (after this change). However, `PickValueModule` checks
   `isinstance(r, model.HistoryDatasetCollectionAssociation)` (line 2372) to
   detect collection inputs. A `CollectionAdapter` would NOT match this check.

   **Action needed**: Either:
   - (a) Ensure merge adapters are materialized to HDCAs before reaching
     PickValueModule (preferred — consistent with CWL path materialization), OR
   - (b) Add `isinstance(r, CollectionAdapter)` checks in PickValueModule.

   Option (a) is preferred. The `PickValueModule` is only created by CWL
   parser's `_add_pick_value_steps()`, so it always runs in the CWL context
   where `build_cwl_input_dict()` materializes adapters. However,
   `PickValueModule.execute()` does NOT use `build_cwl_input_dict()` — it calls
   `progress.replacement_for_input()` directly. So materialization must happen
   either in `replacement_for_input()` itself or in the PickValueModule.

   **Simplest approach**: In `PickValueModule.execute()`, check for
   `CollectionAdapter` and materialize:
   ```python
   if isinstance(replacement, CollectionAdapter):
       replacement = _persist_adapter_as_hdca(replacement, ...)
   ```

2. **Outputs**: `PickValueModule` creates real HDCAs via
   `dataset_collection_manager.create()` (line 2453) — no EphemeralCollection
   involved. No changes needed for outputs.

3. **`_execute_on_merged_collections()`** (line 2513): This method handles
   multi-source pickValue with `link_merge`. It receives HDCAs (not
   EphemeralCollections), iterates their elements, and filters. Currently only
   `merge_flattened` is implemented (line 2521). No EphemeralCollection
   involvement. No changes needed.

4. **`_add_pick_value_steps()`** (parser.py:917): Creates synthetic step dicts
   with `link_merge` from CWL `linkMerge`. The generated steps use
   `input_connections` that point to source steps. The merge handling happens in
   `replacement_for_input_connections()` when the step has multiple input
   connections — same merge path this plan replaces. If a pick_value step has
   multiple input connections (Pattern A in the parser), it will go through the
   multi-connection merge → adapter path. The PickValueModule will then receive
   the adapter as input (see point 1 above).

---

## Testing Strategy

### Conformance Tests (Primary)

The CWL conformance tests are the primary validation. No existing collection
adapters (`PromoteDatasetToCollection`, etc.) have unit tests — they're
validated through integration tests only. Follow the same pattern here.

These conformance tests exercise the merge paths:

| Test ID | Merge Path | Status Check |
|---------|-----------|--------------|
| `wf_wc_scatter_multiple_merge` | A (default) | Must pass |
| `wf_wc_scatter_multiple_flattened` | B (flatten) | Must pass |
| `wf_wc_scatter_multiple_nested` | C (nested) | Must pass |
| `wf_scatter_twopar_oneinput_flattenedmerge` | B (flatten with list inputs) | Must pass |
| `scatter_multi_input_embedded_subworkflow` | A (default, subworkflow) | Must pass |
| `valuefrom_wf_step_multiple` | multiple sources | Must pass |
| `wf_multiplesources_multipletypes` | mixed types | Must pass |

### PickValue Tests

These tests exercise the PickValueModule which is an indirect consumer:

| Test ID | Why |
|---------|-----|
| Any `pickValue` conformance tests | Verify PickValueModule still receives HDCAs |
| Multi-source pickValue with linkMerge | Verify merge → pickValue pipeline |

### Scatter Regression Tests

The CWL scatter code path creates and consumes EphemeralCollections differently
from the merge path. Include these in the regression suite:

| Test ID | Why |
|---------|-----|
| `scatter_wf1` through `scatter_wf4` | Basic scatter (no subcollection wrapping) |
| `scatter_valuefrom*` | Scatter + valueFrom interaction |
| Any nested-collection scatter tests | Exercise line-3110 subcollection wrapping path |

### Development Order

1. Implement adapter classes + Pydantic models + recovery (Steps 1-3)
2. Implement job recording changes (Step 4)
3. Replace creation site in `run.py` (Step 5)
4. Update CWL-path consumption points (Step 5b), including PickValueModule interaction
5. Update remaining consumption points (Step 6)
6. Delete `EphemeralCollection` (Step 7)
7. Run conformance tests to validate

---

## Files Modified

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/adapters.py` | Add 3+ adapter classes + 1-2 helpers + update `recover_adapter()` |
| `lib/galaxy/tool_util_models/parameters.py` | Add 6-8 Pydantic models (3-4 internal + 3-4 external) + update unions |
| `lib/galaxy/workflow/run.py` | Replace EphemeralCollection creation with adapter creation (line 553); replace flush in `subworkflow_progress()` (line 933); replace unwrap in `set_step_outputs()` (line 760) |
| `lib/galaxy/tools/parameters/basic.py` | Remove ephemeral check in `to_json()` (line 1932), update `src_id_to_item()` recovery |
| `lib/galaxy/tools/actions/__init__.py` | Remove ephemeral check (line 1056), extend list-adapting recording for HDCAs |
| `lib/galaxy/managers/collections.py` | Replace ephemeral checks with `isinstance(CollectionAdapter)` (lines 274, 445) |
| `lib/galaxy/model/__init__.py` | Replace ephemeral check with `isinstance(CollectionAdapter)` (line 10287) |
| `lib/galaxy/workflow/modules.py` | Delete `EphemeralCollection` class (line 3594); update `build_cwl_input_dict()` (line 295), `_galaxy_to_cwl_ref()` (line 340), scatter iteration loop (line 3113); potentially update PickValueModule (line 2372) |

**No changes needed:**
- `matching.py` — `not hasattr(hid)` detection still works
- `execute.py` — `uses_ephemeral_collections` flag logic still works
- `lib/galaxy/tool_util/cwl/parser.py` — `_add_pick_value_steps()` generates step dicts, no runtime EphemeralCollection involvement

---

## Risks & Considerations

0. **CWL scatter depends on real HDCA IDs** — `find_cwl_scatter_collections()`
   loads collections from DB via `trans.sa_session.get(HDCA, ref["id"])`. Merge
   adapters flowing through the CWL code path MUST be materialized into real,
   flushed HDCAs in `build_cwl_input_dict()` (Step 5b-i) before scatter detection
   runs. This is a hard constraint — adapters cannot flow lazily through the CWL
   scatter path.

1. **PickValueModule receives replacements directly** — Unlike CWL tool
   execution (which goes through `build_cwl_input_dict()`), PickValueModule
   calls `progress.replacement_for_input()` which may return a merge adapter
   before materialization. Must either materialize in PickValueModule or ensure
   the replacement path always yields HDCAs for pick_value step inputs.

2. **`replacement_for_connection()` return types** — need to verify what types
   are actually returned. For datasets it may return HDA directly or something
   wrapped. For collections it may return HDCA or an `EphemeralCollection` from
   a prior merge. Need to handle the case where a merge adapter feeds into
   another merge.

3. **Default merge for lists** — the current code's default path (no explicit
   merge_type) for list inputs falls through to the flatten branch via the
   `elif input_collection_type == "list":` block without checking merge_type
   explicitly. Need to preserve this behavior (the default `merge_type` is
   `model.WorkflowStepInput.default_merge_type`, set at line 470).

4. **DB migration** — adapter JSON columns already exist on all three job input
   tables. No schema migration needed; new adapter_type values will just appear
   in the JSON.

5. **CollectionAdapter in parameter matching** — the matching code in
   `matching.py` currently handles CollectionAdapters by duck typing (checking
   elements, collection_type). Merge adapters need to satisfy the same
   interface. The `TransientCollectionAdapterCollectionElement` helper is needed
   for nested merge to provide proper `child_collection`.

6. **Subworkflow multi-connection merge** — `subworkflow_progress()` (run.py:921)
   calls `replacement_for_input_connections()` for multi-connection subworkflow
   inputs. The EphemeralCollection flush at line 933 must be replaced with
   adapter materialization. This is a distinct consumption point from the CWL
   tool path.

---

## Unresolved Questions

- The `inputs` passed to merge adapters from `replacement_for_connection()` —
  are they always raw HDA/HDCA objects, or could they be other wrapper types
  (e.g., an adapter from a prior merge step)?
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
- PickValueModule materialization — should we materialize in `replacement_for_input()`
  (transparent to all modules) or only in PickValueModule.execute() (targeted)?
  The former would be a broader change but more robust.
- `DataRequestInternalHdca` — does it exist in `parameters.py`? If not, what
  fields does it need? (Likely mirrors `DataRequestInternalHda` with `src: Literal["hdca"]`.)
