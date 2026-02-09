---
type: research
subtype: component
tags:
  - research/component
  - galaxy/collections
  - galaxy/models
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - collections
  - models
---

# Galaxy Dataset Collection Model Layer

Comprehensive reference for the model layer that underpins Galaxy's dataset collection system.

---

## Table of Contents

1. [Core Model Classes](#1-core-model-classes)
2. [Database Tables and Columns](#2-database-tables-and-columns)
3. [SQLAlchemy Relationships](#3-sqlalchemy-relationships)
4. [Collection Type Plugin System](#4-collection-type-plugin-system)
5. [Type Description and Registry](#5-type-description-and-registry)
6. [Collection Structure and Matching](#6-collection-structure-and-matching)
7. [Builder Pattern](#7-builder-pattern)
8. [Subcollection Splitting and Adapters](#8-subcollection-splitting-and-adapters)
9. [Implicit Collections](#9-implicit-collections)
10. [Manager Layer](#10-manager-layer)
11. [Workflow Integration Models](#11-workflow-integration-models)
12. [Collection Creation Flow](#12-collection-creation-flow)
13. [Key Enums and Constants](#13-key-enums-and-constants)
14. [File Index](#14-file-index)

---

## 1. Core Model Classes

All core model classes live in `lib/galaxy/model/__init__.py`.

### 1.1 DatasetCollection

The root model representing a collection of datasets. This is the "pure data" object -- it has no notion of history or library; it just holds the collection type, population state, and elements.

**Table:** `dataset_collection`

```python
class DatasetCollection(Base, Dictifiable, UsesAnnotations, Serializable):
    __tablename__ = "dataset_collection"
```

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `int` (PK) | Primary key |
| `collection_type` | `str(255)` | e.g. `"list"`, `"paired"`, `"list:paired"` |
| `populated_state` | `str(64)` | `"new"`, `"ok"`, or `"failed"` |
| `populated_state_message` | `TEXT` | Error message if population failed |
| `element_count` | `int` (nullable) | Number of direct child elements |
| `fields` | `JSON` (nullable) | For `record` type -- field definitions |
| `column_definitions` | `JSON` (nullable) | For `sample_sheet` type -- column schema |
| `create_time` / `update_time` | `datetime` | Timestamps |

**Key Properties:**

- `elements` -- ORM relationship to `DatasetCollectionElement`, ordered by `element_index`
- `populated` -- True only if this collection AND all nested subcollections have `populated_state == "ok"`
- `populated_optimized` -- DB-optimized version of `populated` that queries nested collections via SQL
- `has_subcollections` -- `True` if `":"` appears in `collection_type`
- `allow_implicit_mapping` -- `False` for `record` type, `True` for everything else
- `dataset_instances` -- Flattened list of all leaf `HistoryDatasetAssociation` objects (recursive)
- `dataset_elements` -- Flattened list of all leaf `DatasetCollectionElement` objects (recursive)
- `has_deferred_data` -- Whether any leaf dataset has state `DEFERRED`
- `elements_datatypes` -- Aggregated extension counts across all leaf datasets
- `elements_states` -- Aggregated state counts across all leaf datasets
- `elements_deleted` -- Whether any leaf dataset is deleted
- `dataset_action_tuples` -- Permission tuples for all leaf datasets
- `state` -- Currently hardcoded to return `"ok"` (TODO in code)

**Key Methods:**

- `__getitem__(key)` -- Access element by integer index or string identifier
- `copy(...)` -- Deep-copy the collection and all elements
- `copy_from(other)` -- Copy elements from another collection into this one
- `replace_elements_with_copies(replacements, history)` -- Replace elements in-place with copies
- `replace_failed_elements(replacements)` -- Replace specific failed HDAs
- `finalize(collection_type_description)` -- Mark as populated, recursively
- `mark_as_populated()` / `handle_population_failed(message)` -- State transitions
- `validate()` -- Ensures `collection_type` is set
- `_build_nested_collection_attributes_stmt(...)` -- Builds a SQL query that traverses nested collections via self-joins, used by many summary properties
- `dataset_elements_and_identifiers(identifiers=None)` -- Used in remote tool evaluation to walk elements with their identifier paths
- `element_identifiers_extensions_paths_and_metadata_files` -- Returns tuples of (identifiers, extension, path, metadata_files) for all leaf datasets

**The Nested Query Builder:**

`_build_nested_collection_attributes_stmt` is a critical internal method. It builds a SQL SELECT that self-joins `dataset_collection` and `dataset_collection_element` tables once per nesting level (determined by counting `":"` in `collection_type`). This avoids loading all elements into Python for summary computations like state counts, extension sets, and permission tuples.

### 1.2 DatasetCollectionElement

An element within a `DatasetCollection`. An element points to exactly one of: an HDA, an LDDA, or a child `DatasetCollection` (for nesting).

**Table:** `dataset_collection_element`

```python
class DatasetCollectionElement(Base, Dictifiable, Serializable):
    __tablename__ = "dataset_collection_element"
```

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `int` (PK) | Primary key |
| `dataset_collection_id` | `int` (FK) | Parent collection |
| `hda_id` | `int` (FK, nullable) | Points to HDA if leaf element |
| `ldda_id` | `int` (FK, nullable) | Points to LDDA if leaf element |
| `child_collection_id` | `int` (FK, nullable) | Points to nested `DatasetCollection` |
| `element_index` | `int` | Ordering index within parent |
| `element_identifier` | `str(255)` | Human-readable name (e.g. `"forward"`, `"sample1"`) |
| `columns` | `JSON` (nullable) | For `sample_sheet` elements -- row metadata values |

**Constraint:** Exactly one of `hda_id`, `ldda_id`, or `child_collection_id` should be non-null (enforced in `__init__`, not as a DB constraint).

**Key Properties:**

- `element_type` -- Returns `"hda"`, `"ldda"`, or `"dataset_collection"`
- `is_collection` -- `True` if `element_type == "dataset_collection"`
- `element_object` -- Returns whichever of `hda`, `ldda`, or `child_collection` is set
- `dataset_instance` -- Returns the HDA/LDDA; raises `AttributeError` if this is a nested collection
- `dataset` -- Returns the underlying `Dataset` object
- `has_deferred_data` -- Delegates to `element_object`
- `auto_propagated_tags` -- Tags from the first dataset instance that should auto-propagate

**Special Sentinel:**

`DatasetCollectionElement.UNINITIALIZED_ELEMENT` is an `object()` sentinel used during pre-creation of implicit collections. Elements are created with this placeholder and later populated when jobs complete.

### 1.3 DatasetCollectionInstance (Abstract Base)

Not a database table itself -- a Python-level mixin/base class that provides shared behavior for HDCA and LDCA.

```python
class DatasetCollectionInstance(HasName, UsesCreateAndUpdateTime):
```

**Key Properties (delegated to `.collection`):**

- `state`, `populated`, `dataset_instances`, `has_deferred_data`

**Key Methods:**

- `_base_to_dict(view)` -- Common dict serialization
- `set_from_dict(new_data)` -- Update from dict, delegates to collection + own editable keys

### 1.4 HistoryDatasetCollectionAssociation (HDCA)

Associates a `DatasetCollection` with a `History`. This is the primary user-facing collection object.

**Table:** `history_dataset_collection_association`

```python
class HistoryDatasetCollectionAssociation(
    Base, DatasetCollectionInstance, HasTags, Dictifiable, UsesAnnotations, Serializable
):
```

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `int` (PK) | Primary key |
| `collection_id` | `int` (FK) | Points to `DatasetCollection` |
| `history_id` | `int` (FK) | Parent history |
| `name` | `str(255)` | Display name |
| `hid` | `int` | History item ID (ordering within history) |
| `visible` | `bool` | Whether shown in history panel |
| `deleted` | `bool` | Soft-delete flag |
| `copied_from_history_dataset_collection_association_id` | `int` (FK, nullable) | Copy provenance |
| `implicit_output_name` | `str(255)` (nullable) | Tool output name if this is an implicit collection |
| `job_id` | `int` (FK, nullable) | The single job that produced this (for non-mapped tools) |
| `implicit_collection_jobs_id` | `int` (FK, nullable) | The `ImplicitCollectionJobs` group (for mapped tools) |
| `create_time` / `update_time` | `datetime` | Timestamps |

**Key Relationships:**

- `collection` -- The `DatasetCollection` object
- `history` -- The parent `History`
- `implicit_input_collections` -- List of `ImplicitlyCreatedDatasetCollectionInput` (which input collections produced this)
- `implicit_collection_jobs` -- The `ImplicitCollectionJobs` object (job group)
- `job` -- Single `Job` (for non-implicit collections created by a tool)
- `tags`, `annotations`, `ratings` -- Standard Galaxy associations
- `creating_job_associations` -- `JobToOutputDatasetCollectionAssociation` (viewonly)
- `copied_from_history_dataset_collection_association` -- Self-referential copy chain
- `tool_request_association` -- Link to `ToolRequestImplicitCollectionAssociation`

**Key Properties:**

- `job_source_type` -- Returns `"ImplicitCollectionJobs"` or `"Job"` or `None`
- `job_source_id` -- Returns `implicit_collection_jobs_id` or `job_id`
- `job_state_summary` -- Aggregate `JobStateSummary` (named tuple of state counts) computed via SQL
- `dataset_dbkeys_and_extensions_summary` -- Tuple of (dbkeys, extensions, states, deleted, store_times)
- `history_content_type` -- Always `"dataset_collection"`
- `type_id` -- Hybrid property: `"dataset_collection-{id}"`
- `waiting_for_elements` -- Checks job states + collection population state

**Key Methods:**

- `copy(...)` -- Deep copy: creates new HDCA with copied collection and elements
- `add_implicit_input_collection(name, hdca)` -- Records which input HDCA was mapped over
- `find_implicit_input_collection(name)` -- Looks up input HDCA by parameter name
- `to_hda_representative(multiple=False)` -- Gets representative HDA(s) from the collection
- `contains_collection(collection_id)` -- Uses recursive CTE SQL to check membership
- `touch()` -- Flags for update (triggers `update_time` change)

### 1.5 LibraryDatasetCollectionAssociation (LDCA)

Associates a `DatasetCollection` with a library folder. Much simpler than HDCA.

**Table:** `library_dataset_collection_association`

**Key Fields:** `id`, `collection_id` (FK), `folder_id` (FK), `name`, `deleted`

**Relationships:** `collection`, `folder`, `tags`, `annotations`, `ratings`

### 1.6 CollectionStateSummary

A `NamedTuple` used to aggregate state information across all leaf datasets:

```python
class CollectionStateSummary(NamedTuple):
    dbkeys: list[Union[str, None]]
    extensions: list[str]
    states: dict[str, int]
    deleted: int
```

---

## 2. Database Tables and Columns

### Core Collection Tables

```
dataset_collection
├── id (PK)
├── collection_type (VARCHAR 255)
├── populated_state (VARCHAR 64, default "ok")
├── populated_state_message (TEXT)
├── element_count (INT, nullable)
├── fields (JSON, nullable)           -- record type field definitions
├── column_definitions (JSON, nullable) -- sample_sheet column definitions
├── create_time (DATETIME)
└── update_time (DATETIME)

dataset_collection_element
├── id (PK)
├── dataset_collection_id (FK -> dataset_collection.id, indexed)
├── hda_id (FK -> history_dataset_association.id, nullable, indexed)
├── ldda_id (FK -> library_dataset_dataset_association.id, nullable, indexed)
├── child_collection_id (FK -> dataset_collection.id, nullable, indexed)
├── element_index (INT)
├── element_identifier (VARCHAR 255)
└── columns (JSON, nullable)          -- sample_sheet row values

history_dataset_collection_association
├── id (PK)
├── collection_id (FK -> dataset_collection.id, indexed)
├── history_id (FK -> history.id, indexed)
├── name (VARCHAR 255)
├── hid (INT)
├── visible (BOOL)
├── deleted (BOOL, default false)
├── copied_from_history_dataset_collection_association_id (FK -> self.id)
├── implicit_output_name (VARCHAR 255, nullable)
├── job_id (FK -> job.id, nullable, indexed)
├── implicit_collection_jobs_id (FK -> implicit_collection_jobs.id, nullable, indexed)
├── create_time (DATETIME)
└── update_time (DATETIME, indexed)

library_dataset_collection_association
├── id (PK)
├── collection_id (FK -> dataset_collection.id, indexed)
├── folder_id (FK -> library_folder.id, indexed)
├── name (VARCHAR 255)
└── deleted (BOOL, default false)
```

### Job-Collection Association Tables

```
job_to_input_dataset_collection
├── id (PK)
├── job_id (FK -> job.id, indexed)
├── dataset_collection_id (FK -> history_dataset_collection_association.id, indexed)
├── name (VARCHAR 255)
└── adapter (JSON, nullable)          -- serialized adapter for ephemeral collections

job_to_input_dataset_collection_element
├── id (PK)
├── job_id (FK -> job.id, indexed)
├── dataset_collection_element_id (FK -> dataset_collection_element.id, indexed)
├── name (VARCHAR 255)
└── adapter (JSON, nullable)

job_to_output_dataset_collection
├── id (PK)
├── job_id (FK -> job.id, indexed)
├── dataset_collection_id (FK -> history_dataset_collection_association.id, indexed)
└── name (VARCHAR 255)

job_to_implicit_output_dataset_collection
├── id (PK)
├── job_id (FK -> job.id, indexed)
├── dataset_collection_id (FK -> dataset_collection.id, indexed)
└── name (VARCHAR 255)
```

Note the distinction: `job_to_output_dataset_collection` points to HDCA (the instance), while `job_to_implicit_output_dataset_collection` points to `DatasetCollection` (the raw collection). Many jobs map to one HDCA for output collections (when mapping over), but each job maps to at most one `DatasetCollection` per output.

### Implicit Collection Tables

```
implicit_collection_jobs
├── id (PK)
└── populated_state (VARCHAR 64, default "new")

implicit_collection_jobs_job_association
├── id (PK)
├── implicit_collection_jobs_id (FK -> implicit_collection_jobs.id, indexed)
├── job_id (FK -> job.id, indexed)
└── order_index (INT)

implicitly_created_dataset_collection_inputs
├── id (PK)
├── dataset_collection_id (FK -> history_dataset_collection_association.id, indexed)
├── input_dataset_collection_id (FK -> history_dataset_collection_association.id, indexed)
└── name (VARCHAR 255)

tool_request_implicit_collection_association
├── id (PK)
├── tool_request_id (FK -> tool_request.id, indexed)
├── dataset_collection_id (FK -> history_dataset_collection_association.id, indexed)
└── output_name (VARCHAR 255)
```

---

## 3. SQLAlchemy Relationships

### DatasetCollection

```
DatasetCollection.elements -> [DatasetCollectionElement]  (ordered by element_index)
```

### DatasetCollectionElement

```
DCE.collection    -> DatasetCollection  (parent, via dataset_collection_id)
DCE.hda           -> HistoryDatasetAssociation
DCE.ldda          -> LibraryDatasetDatasetAssociation
DCE.child_collection -> DatasetCollection  (nested child, via child_collection_id)
```

### HistoryDatasetCollectionAssociation

```
HDCA.collection                    -> DatasetCollection
HDCA.history                       -> History (back_populates="dataset_collections")
HDCA.implicit_input_collections    -> [ImplicitlyCreatedDatasetCollectionInput]
HDCA.implicit_collection_jobs      -> ImplicitCollectionJobs (uselist=False)
HDCA.job                           -> Job (uselist=False)
HDCA.tags                          -> [HistoryDatasetCollectionTagAssociation]
HDCA.annotations                   -> [HDCAAnnotationAssociation]
HDCA.ratings                       -> [HDCACollectionRatingAssociation]
HDCA.creating_job_associations     -> [JobToOutputDatasetCollectionAssociation] (viewonly)
HDCA.copied_from_hdca              -> HDCA (self-referential)
HDCA.tool_request_association      -> ToolRequestImplicitCollectionAssociation
```

### ImplicitCollectionJobs

```
ICJ.jobs -> [ImplicitCollectionJobsJobAssociation]  (back_populates)
```

### ImplicitCollectionJobsJobAssociation

```
ICJJA.implicit_collection_jobs -> ImplicitCollectionJobs
ICJJA.job                      -> Job
```

### ImplicitlyCreatedDatasetCollectionInput

```
ICDCI.input_dataset_collection -> HDCA  (the input that was mapped over)
```

---

## 4. Collection Type Plugin System

### Directory: `lib/galaxy/model/dataset_collections/types/`

Each collection type is a plugin class inheriting from `BaseDatasetCollectionType`.

### BaseDatasetCollectionType (Abstract Base)

```python
class BaseDatasetCollectionType(metaclass=ABCMeta):
    collection_type: str

    @abstractmethod
    def generate_elements(self, dataset_instances: DatasetInstanceMapping, **kwds
    ) -> Iterable[DatasetCollectionElement]:
        """Generate elements from a mapping of identifier->dataset/collection."""

    def _validation_failed(self, message):
        raise ObjectAttributeInvalidException(message)
```

`DatasetInstanceMapping` is `Mapping[str, Union[DatasetCollection, DatasetInstance]]` -- an ordered dict from element identifier to either a dataset or a nested collection.

### ListDatasetCollectionType

**File:** `types/list.py`
**`collection_type`:** `"list"`

The simplest type. Accepts any number of elements with arbitrary identifiers. Just yields a `DatasetCollectionElement` for each entry in `dataset_instances`.

```python
def generate_elements(self, dataset_instances, **kwds):
    for identifier, element in dataset_instances.items():
        yield DatasetCollectionElement(element=element, element_identifier=identifier)
```

No validation on identifiers, no fixed element count.

### PairedDatasetCollectionType

**File:** `types/paired.py`
**`collection_type`:** `"paired"`

Fixed structure: exactly two elements with identifiers `"forward"` and `"reverse"`.

Also provides `prototype_elements()` which yields two placeholder elements -- used when the structure must be known before actual data exists (e.g. for pre-creating implicit output collections).

**Constants:** `FORWARD_IDENTIFIER = "forward"`, `REVERSE_IDENTIFIER = "reverse"`

### PairedOrUnpairedDatasetCollectionType

**File:** `types/paired_or_unpaired.py`
**`collection_type`:** `"paired_or_unpaired"`

A union type: either 1 element (`"unpaired"`) or 2 elements (`"forward"` + `"reverse"`). Validates element count is 1 or 2.

**Constant:** `SINGLETON_IDENTIFIER = "unpaired"`

This is used for genomics workflows where samples may be single-end or paired-end reads. A `paired_or_unpaired` input can consume either a `paired` collection (treated as its forward/reverse case) or a single dataset (wrapped as unpaired).

### RecordDatasetCollectionType

**File:** `types/record.py`
**`collection_type`:** `"record"`

CWL-style heterogeneous named fields. Requires a `fields` keyword argument providing the schema. Validates that supplied elements match the field definitions.

Also provides `prototype_elements(fields=...)` for pre-creation.

**Important:** `DatasetCollection.allow_implicit_mapping` returns `False` for record types, meaning records cannot be mapped over.

### SampleSheetDatasetCollectionType

**File:** `types/sample_sheet.py`
**`collection_type`:** `"sample_sheet"`

A list-like collection where each element carries additional column metadata (`columns` field on `DatasetCollectionElement`). Requires `rows` and `column_definitions` keyword arguments. Validates each row against the column definitions.

### Collection Type Nesting

Collection types compose via `":"` separator. For `"list:paired"`:
- The outer level is a `list` (arbitrary count, arbitrary identifiers)
- Each element at the outer level is a `DatasetCollection` of type `"paired"`
- Those inner collections each have `"forward"` and `"reverse"` elements

The nesting is stored as:
```
DatasetCollection(collection_type="list:paired")
  └── DatasetCollectionElement(element_identifier="sample1", child_collection_id=X)
        └── DatasetCollection(collection_type="paired")
              ├── DatasetCollectionElement(element_identifier="forward", hda_id=A)
              └── DatasetCollectionElement(element_identifier="reverse", hda_id=B)
  └── DatasetCollectionElement(element_identifier="sample2", child_collection_id=Y)
        └── DatasetCollection(collection_type="paired")
              ├── DatasetCollectionElement(element_identifier="forward", hda_id=C)
              └── DatasetCollectionElement(element_identifier="reverse", hda_id=D)
```

---

## 5. Type Description and Registry

### CollectionTypeDescriptionFactory

**File:** `lib/galaxy/model/dataset_collections/type_description.py`

Factory for creating `CollectionTypeDescription` instances:

```python
COLLECTION_TYPE_DESCRIPTION_FACTORY = CollectionTypeDescriptionFactory()
```

The factory holds a reference to the type registry (though it doesn't heavily use it yet).

### CollectionTypeDescription

The workhorse class for reasoning about collection types at an abstract level. Wraps a collection type string (e.g. `"list:paired"`) and provides methods for querying type relationships.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `rank_collection_type()` | Outermost type. `"list:paired"` -> `"list"` |
| `child_collection_type()` | Inner type after removing rank. `"list:paired"` -> `"paired"` |
| `child_collection_type_description()` | Returns a new `CollectionTypeDescription` for the child type |
| `has_subcollections()` | `True` if `":"` in type |
| `subcollection_type_description()` | Same as `child_collection_type_description()` |
| `effective_collection_type(subcollection_type)` | Computes remaining type after consuming a subcollection. `"list:list:paired".effective("paired")` -> `"list:list"` |
| `has_subcollections_of_type(other)` | Whether this type contains proper subcollections of another type |
| `is_subcollection_of_type(other)` | Inverse of above |
| `can_match_type(other)` | Whether two types are compatible for linked matching |
| `multiply(other)` | Combines types: `"list" * "paired"` -> `"list:paired"` |
| `rank_type_plugin()` | Returns the plugin instance for the outermost rank |
| `dimension` | Number of type components + 1. `"list"` = 2, `"list:paired"` = 3 |
| `validate()` | Checks against `COLLECTION_TYPE_REGEX` |

**Special Type Matching for `paired_or_unpaired`:**

`has_subcollections_of_type`:
- `paired_or_unpaired` is treated as a subcollection of anything except `"paired"` (since `paired` exactly matches it)
- `"single_datasets"` is a valid subcollection type for any collection

`can_match_type`:
- `paired` can match `paired_or_unpaired`
- Types ending in `:paired_or_unpaired` can match the corresponding plain list or the paired list variant

### Collection Type Validation Regex

```python
COLLECTION_TYPE_REGEX = re.compile(
    r"^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*"
    r"|sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$"
)
```

Valid types: any combination of `list`, `paired`, `paired_or_unpaired`, `record` separated by `:`, OR `sample_sheet` optionally followed by one of `:paired`, `:record`, `:paired_or_unpaired`.

### DatasetCollectionTypesRegistry

**File:** `lib/galaxy/model/dataset_collections/registry.py`

```python
PLUGIN_CLASSES = [
    ListDatasetCollectionType,
    PairedDatasetCollectionType,
    RecordDatasetCollectionType,
    PairedOrUnpairedDatasetCollectionType,
    SampleSheetDatasetCollectionType,
]

class DatasetCollectionTypesRegistry:
    def __init__(self):
        self.__plugins = {p.collection_type: p() for p in PLUGIN_CLASSES}

    def get(self, plugin_type) -> BaseDatasetCollectionType
    def prototype(self, plugin_type, fields=None) -> DatasetCollection
```

The `prototype()` method creates an empty `DatasetCollection` with placeholder elements matching the type structure. Only works for types with `prototype_elements` (`paired` and `record`).

**Singleton:** `DATASET_COLLECTION_TYPES_REGISTRY = DatasetCollectionTypesRegistry()`

---

## 6. Collection Structure and Matching

### 6.1 Structure Module

**File:** `lib/galaxy/model/dataset_collections/structure.py`

Provides tree-based reasoning about collection structure for matching and output computation.

#### Leaf

Represents a terminal node (single dataset). Singleton: `leaf = Leaf()`.

- `is_leaf` = `True`
- `multiply(other)` = `other.clone()` (leaf times anything = that thing)
- `__len__()` = 1

#### UninitializedTree

A tree whose children are not yet known -- only the collection type is known. Used for output structures before jobs have run.

- `children_known` = `False`
- `multiply(other)` -- Produces another `UninitializedTree` with combined type

#### Tree

A fully materialized tree with known children.

```python
class Tree(BaseTree):
    def __init__(self, children, collection_type_description, when_values=None):
        self.children = children  # list of (identifier, substructure) tuples
        self.when_values = when_values
```

**Key Methods:**

- `Tree.for_dataset_collection(dc, ctd)` -- Static factory. Recursively walks a `DatasetCollection`'s elements to build the tree. Leaf elements become `leaf` nodes; subcollections become subtrees.

- `walk_collections(hdca_dict)` -- Iterates over the tree structure, yielding `(element_dict, when_value)` tuples at leaf positions. Each `element_dict` maps input names to their corresponding `DatasetCollectionElement` at that position. This is the core iterator used during job expansion.

- `can_match(other_structure)` -- Checks structural compatibility:
  1. Collection types must be compatible (via `can_match_type`)
  2. Same number of children at each level
  3. Nested structure matches recursively

- `multiply(other_structure)` -- Computes the cross-product structure. If mapping a `list[a,b]` over a tool that outputs `paired`, the result is `list:paired` with `{a: paired, b: paired}`.

- `clone()` -- Deep copy.

#### get_structure()

```python
def get_structure(dataset_collection_instance, collection_type_description, leaf_subcollection_type=None):
```

Converts a `DatasetCollectionInstance` (HDCA or DCE) into a `Tree`. If `leaf_subcollection_type` is specified, computes the effective type after consuming that subcollection type.

#### tool_output_to_structure()

```python
def tool_output_to_structure(get_sliced_input_collection_structure, tool_output, collections_manager):
```

Determines the output structure for a tool output. Handles three cases:
1. `structured_like` -- Output mirrors an input's structure
2. `collection_type_source` -- Output type derived from an input's type
3. Explicit `collection_type` -- Fixed output type

### 6.2 Matching Module

**File:** `lib/galaxy/model/dataset_collections/matching.py`

#### CollectionsToMatch

Accumulates collections that need to be matched for tool execution:

```python
class CollectionsToMatch:
    def add(self, input_name, hdca, subcollection_type=None, linked=True):
```

Each added collection records:
- `hdca` -- The HDCA being mapped over
- `subcollection_type` -- The subcollection type to consume (e.g. `"paired"` when mapping `list:paired` over a paired input)
- `linked` -- Whether this collection should be linked (dot-product) or unlinked (cross-product) with others

#### MatchingCollections

Result of matching collections. Created by `MatchingCollections.for_collections(collections_to_match, type_descriptions)`.

```python
class MatchingCollections:
    linked_structure: Tree        # Structure for linked collections
    unlinked_structures: [Tree]   # Structures for cross-product collections
    collections: dict             # input_name -> hdca
    subcollection_types: dict     # input_name -> subcollection_type
```

**Key Methods:**

- `slice_collections()` -- Calls `linked_structure.walk_collections()` to iterate over element slices. Each slice is a dict mapping input names to their `DatasetCollectionElement` at that position.

- `structure` -- The effective mapping structure: cross-product of unlinked structures multiplied by the linked structure. Returns `None` if everything is a leaf (no mapping).

- `is_mapped_over(input_name)` -- Whether a specific input is being mapped over.

- `map_over_action_tuples(input_name)` -- Permission tuples for the mapped-over collection.

### 6.3 Query Module

**File:** `lib/galaxy/model/dataset_collections/query.py`

`HistoryQuery` determines which collections in a history are valid for a given tool parameter:

```python
class HistoryQuery:
    def direct_match(self, hdca) -> bool     # Can this HDCA be used directly?
    def can_map_over(self, hdca)              # Can this HDCA be mapped over? Returns type description or False.
```

Key behavior: `from_collection_types` sorts type descriptions by dimension (descending) so that subcollection mapping defaults to providing the tool as much data as possible.

---

## 7. Builder Pattern

**File:** `lib/galaxy/model/dataset_collections/builder.py`

### build_collection()

Top-level function to create a `DatasetCollection`:

```python
def build_collection(type, dataset_instances, collection=None, associated_identifiers=None,
                     fields=None, column_definitions=None, rows=None) -> DatasetCollection:
```

1. Creates or reuses a `DatasetCollection`
2. Calls `set_collection_elements()` which invokes `type.generate_elements()` on the plugin
3. Assigns `element_index` to each element
4. Adds elements to collection
5. Updates `element_count`

### CollectionBuilder

Functional builder for constructing collections programmatically (used when creating implicit output collections):

```python
builder = CollectionBuilder(collection_type_description)
builder.add_dataset("sample1", hda1)
builder.add_dataset("sample2", hda2)
collection = builder.build()
```

For nested collections:

```python
builder = CollectionBuilder(ctd_for("list:paired"))
level = builder.get_level("sample1")  # returns sub-builder for "paired"
level.add_dataset("forward", hda_f)
level.add_dataset("reverse", hda_r)
collection = builder.build()
```

**Key Methods:**

- `get_level(identifier)` -- Returns a sub-`CollectionBuilder` for nested collections
- `add_dataset(identifier, dataset_instance)` -- Adds a leaf element
- `build()` -- Constructs the `DatasetCollection`, calling the type plugin's `generate_elements`
- `build_elements()` -- Recursively builds element dict (sub-builders -> sub-collections)
- `replace_elements_in_collection(template, replacements)` -- Creates a new collection with replaced datasets

### BoundCollectionBuilder

Extends `CollectionBuilder` for modifying an existing (unpopulated) `DatasetCollection`:

```python
class BoundCollectionBuilder(CollectionBuilder):
    def __init__(self, dataset_collection):
        # Reads type from the existing collection
        # Fails if collection is already populated

    def populate_partial(self):
        # Adds elements without marking as populated

    def populate(self):
        # Adds elements AND marks as populated
```

This is used during job completion to fill in elements of pre-created implicit collections.

---

## 8. Subcollection Splitting and Adapters

### 8.1 Subcollection Splitting

**File:** `lib/galaxy/model/dataset_collections/subcollections.py`

When mapping a nested collection over a subcollection type, the collection must be split into its subcollections.

```python
def split_dataset_collection_instance(hdca, collection_type) -> SplitReturnType:
```

For example, splitting a `list:paired` by `"paired"` yields a list of `DatasetCollectionElement` objects, each pointing to a `paired` child collection.

Special case: splitting by `"single_datasets"` wraps each leaf element in a `PromoteCollectionElementToCollectionAdapter`, effectively treating each dataset as a `paired_or_unpaired` collection with a single `"unpaired"` element.

### 8.2 Adapters

**File:** `lib/galaxy/model/dataset_collections/adapters.py`

Adapters create ephemeral/pseudo collections that don't exist in the database but present a collection-like interface for tool processing.

#### CollectionAdapter (Abstract Base)

Defines the interface: `dataset_action_tuples`, `dataset_states_and_extensions_summary`, `dataset_instances`, `elements`, `to_adapter_model()`, `adapting`, `collection`, `collection_type`.

#### DCECollectionAdapter

Wraps a `DatasetCollectionElement` to act as a collection. If the element has a child collection, delegates to it; if it's a leaf dataset, wraps it.

#### PromoteCollectionElementToCollectionAdapter

Extends `DCECollectionAdapter`. Promotes a single leaf element to act as a `paired_or_unpaired` collection (the `"single_datasets"` subcollection mapping case).

- `collection_type` always returns `"paired_or_unpaired"`

#### PromoteDatasetToCollection

Wraps a single HDA to act as either a `list` or `paired_or_unpaired` collection.

- For `paired_or_unpaired`, the element identifier is `"unpaired"`
- For `list`, the element identifier is the HDA's name

#### PromoteDatasetsToCollection

Wraps multiple HDAs to act as either a `paired` or `paired_or_unpaired` collection.

#### TransientCollectionAdapterDatasetInstanceElement

Lightweight stand-in for `DatasetCollectionElement` used by adapters. Has `element_identifier`, `hda`, `child_collection=None`, `element_object`, `dataset_instance`, `is_collection=False`, `columns=None`.

#### recover_adapter()

Reconstructs an adapter from its serialized model (stored in `job_to_input_dataset_collection.adapter` JSON field).

#### Adapter Serialization

Each adapter has a `to_adapter_model()` method that returns a Pydantic model describing how to reconstruct it. This is stored as JSON in the `adapter` column of the job input association tables.

---

## 9. Implicit Collections

"Implicit collections" are output collections created automatically when mapping a collection over tool inputs. The system pre-creates these before jobs run and populates them as jobs complete.

### 9.1 ImplicitCollectionJobs

Groups all jobs that were created by mapping a collection over a tool.

**Table:** `implicit_collection_jobs`

```python
class ImplicitCollectionJobs(Base, Serializable):
    populated_state: str  # "new", "ok", or "failed"
    jobs: [ImplicitCollectionJobsJobAssociation]
```

**States (inner enum `populated_states`):**
- `NEW` -- Job associations not yet finalized
- `OK` -- All job associations set and fixed
- `FAILED` -- Problem populating job associations

**Key Properties:**
- `job_list` -- Returns all associated `Job` objects
- `get_job_attributes(attributes)` -- Efficient query for specific job attributes

### 9.2 ImplicitCollectionJobsJobAssociation

Links an `ImplicitCollectionJobs` to a specific `Job` with an ordering index.

**Fields:** `implicit_collection_jobs_id`, `job_id`, `order_index`

### 9.3 ImplicitlyCreatedDatasetCollectionInput

Records which input collections were used to create an implicit output collection. Stored on the HDCA.

**Fields:** `dataset_collection_id` (the output HDCA), `input_dataset_collection_id` (the input HDCA), `name` (the input parameter name)

### 9.4 ToolRequestImplicitCollectionAssociation

Links a `ToolRequest` to its implicit output collections.

**Fields:** `tool_request_id`, `dataset_collection_id` (output HDCA), `output_name`

### 9.5 How Implicit Collections Are Created

1. **Pre-creation** (`DatasetCollectionManager.precreate_dataset_collection_instance`):
   - Determines the output structure by multiplying the mapping structure with the output structure
   - Creates `DatasetCollection` objects with `populated_state="new"` (or `UNINITIALIZED_ELEMENT` sentinels)
   - Creates the HDCA, sets `implicit_output_name` and `implicit_input_collections`
   - For known structures (children_known=True), creates placeholder elements pointing to UNINITIALIZED_ELEMENT or sub-collections

2. **Job creation**: Each element position in the mapping structure becomes a separate job. An `ImplicitCollectionJobs` object groups them.

3. **Job completion**: The `BoundCollectionBuilder` is used to populate the pre-created collection with actual output datasets. `populate_partial()` adds elements incrementally; `populate()` marks as complete.

4. **Finalization**: `DatasetCollection.finalize()` recursively marks all subcollections as populated.

---

## 10. Manager Layer

### 10.1 DatasetCollectionManager

**File:** `lib/galaxy/managers/collections.py`

Primary service interface for collection operations. Manages:
- Collection creation (user-initiated and implicit)
- Pre-creation of implicit output collections
- Collection matching for tool execution
- CRUD operations
- Rule-based collection building

**Constructor dependencies:** `model` (ORM session), `security`, `hda_manager`, `history_manager`, `ldda_manager`, `short_term_storage_monitor`

**Key Method: `create()`**

```python
def create(self, trans, parent, name, collection_type, element_identifiers=None,
           elements=None, ...) -> DatasetCollectionInstance:
```

Flow:
1. Validates and sanitizes element identifiers (unless trusted)
2. Creates the `DatasetCollection` via `create_dataset_collection()`
3. Wraps in an HDCA or LDCA via `_create_instance_for_collection()`
4. Handles tags (from list or dict), implicit inputs, implicit output name
5. Persists to database

**Key Method: `create_dataset_collection()`**

```python
def create_dataset_collection(self, trans, collection_type, element_identifiers=None,
                              elements=None, ...) -> DatasetCollection:
```

Flow:
1. Gets `CollectionTypeDescription` for the type
2. If `element_identifiers` provided (API request), resolves them to actual objects via `__load_elements()`
3. If `elements` provided (internal), recursively creates subcollections if needed
4. Calls `builder.build_collection()` with the type plugin
5. Sets `collection_type` on the result

**Key Method: `precreate_dataset_collection_instance()`**

For implicit collections -- creates the HDCA with a pre-created (possibly partially initialized) collection.

**Key Method: `match_collections()`**

```python
def match_collections(self, collections_to_match) -> MatchingCollections:
    return MatchingCollections.for_collections(collections_to_match, self.collection_type_descriptions)
```

**Key Method: `apply_rules()`**

Applies rule-based collection manipulation. Takes an existing HDCA, flattens it to tabular data+sources, applies a rule set, then builds new elements from the result.

### 10.2 HDCAManager

**File:** `lib/galaxy/managers/hdcas.py`

CRUD manager for HDCAs. Extends `ModelManager`, `AccessibleManagerMixin`, `OwnableManagerMixin`, `PurgableManagerMixin`, `AnnotatableManagerMixin`.

**Key Method: `map_datasets(content, fn, *parents)`**

Recursively iterates over all datasets in a collection, calling `fn` on each. Used for bulk attribute updates.

**Ownership:** Checked via `history.user == user` (or anonymous session match).

### 10.3 Serializers

The file also contains serializers:

- `DCESerializer` -- Serializes `DatasetCollectionElement` (delegates to `HDASerializer` or `DCSerializer` based on element type)
- `DCSerializer` -- Serializes `DatasetCollection`
- `DCASerializer` -- Abstract base for instance serializers (proxies most fields to `DCSerializer`)
- `HDCASerializer` -- Serializes HDCA with full history context (hid, visible, deleted, job state summary, tags, etc.)

---

## 11. Workflow Integration Models

### WorkflowRequestToInputDatasetCollectionAssociation

**Table:** `workflow_request_to_input_collection_dataset`

Records which HDCA was used as input to a workflow invocation step.

**Fields:** `workflow_invocation_id`, `workflow_step_id`, `dataset_collection_id` (FK to HDCA), `name`, `request` (JSON)

### WorkflowInvocationOutputDatasetCollectionAssociation

**Table:** `workflow_invocation_output_dataset_collection_association`

Records HDCA outputs of a workflow invocation.

**Fields:** `workflow_invocation_id`, `workflow_step_id`, `dataset_collection_id` (FK to HDCA), `workflow_output_id`

### WorkflowInvocationStepOutputDatasetCollectionAssociation

**Table:** `workflow_invocation_step_output_dataset_collection_association`

Records HDCA outputs at the individual step level.

**Fields:** `workflow_invocation_step_id`, `workflow_step_id`, `dataset_collection_id` (FK to HDCA), `output_name`

---

## 12. Collection Creation Flow

### User-Initiated Collection Creation (API)

```
API Request (element_identifiers, collection_type)
  │
  ▼
DatasetCollectionManager.create()
  │
  ├── validate_input_element_identifiers()
  │
  ├── create_dataset_collection()
  │     │
  │     ├── CollectionTypeDescriptionFactory.for_collection_type()
  │     │
  │     ├── __load_elements() or __recursively_create_collections_for_elements()
  │     │     │
  │     │     └── For each identifier: resolve src (hda/ldda/hdca/new_collection)
  │     │         - hda: hda_manager.get_accessible()
  │     │         - ldda: ldda_manager.get() + to_history_dataset_association()
  │     │         - hdca: __get_history_collection_instance().collection
  │     │         - new_collection: recursive create_dataset_collection()
  │     │
  │     └── builder.build_collection(type_plugin, elements)
  │           │
  │           └── type_plugin.generate_elements(elements)
  │                 └── yields DatasetCollectionElement objects
  │
  ├── _create_instance_for_collection()
  │     │
  │     ├── Create HDCA or LDCA
  │     ├── Set implicit_input_collections if applicable
  │     ├── parent.add_dataset_collection() for HIDs
  │     └── Apply tags
  │
  └── __persist() -> flush to DB
```

### Implicit Collection Creation (Tool Execution)

```
Tool execution with collection input (map-over scenario)
  │
  ▼
ExecutionTracker.precreate_output_collections()
  │
  ├── Compute _mapped_output_structure()
  │     │
  │     ├── tool_output_to_structure() -- output's own structure
  │     └── mapping_structure.multiply(output_structure) -- combined
  │
  ├── DatasetCollectionManager.precreate_dataset_collection_instance()
  │     │
  │     ├── precreate_dataset_collection(structure)
  │     │     │
  │     │     ├── If structure unknown: DatasetCollection(populated=False)
  │     │     ├── If structure known:
  │     │     │     ├── Create DatasetCollection(populated=False)
  │     │     │     └── For each (identifier, substructure) in children:
  │     │     │           ├── Leaf: UNINITIALIZED_ELEMENT placeholder
  │     │     │           └── Subcollection: recursive precreate_dataset_collection()
  │     │     └── Create DatasetCollectionElement for each
  │     │
  │     └── _create_instance_for_collection() with implicit_output_name
  │
  ├── Create ImplicitCollectionJobs
  │
  └── For each element position in mapping structure:
        ├── Create Job
        ├── Create ImplicitCollectionJobsJobAssociation(order_index=i)
        └── Create JobToOutputDatasetCollectionAssociation
              (many jobs -> one HDCA)

--- Later, when each job completes ---

BoundCollectionBuilder(pre_created_collection)
  .add_dataset(identifier, output_hda)
  .populate_partial()  or  .populate()
```

---

## 13. Key Enums and Constants

### DatasetCollectionPopulatedState

**File:** `lib/galaxy/schema/schema.py`

```python
class DatasetCollectionPopulatedState(str, Enum):
    NEW = "new"      # Unpopulated elements
    OK = "ok"        # Elements populated (HDAs may still have errors)
    FAILED = "failed" # Problem populating, won't be populated
```

### ImplicitCollectionJobs.populated_states

```python
class populated_states(str, Enum):
    NEW = "new"      # Unpopulated job associations
    OK = "ok"        # Job associations set and fixed
    FAILED = "failed" # Issues populating job associations
```

### Type Constants

```python
# In paired.py
FORWARD_IDENTIFIER = "forward"
REVERSE_IDENTIFIER = "reverse"

# In paired_or_unpaired.py
SINGLETON_IDENTIFIER = "unpaired"

# In type_description.py
COLLECTION_TYPE_REGEX = re.compile(
    r"^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*"
    r"|sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$"
)
```

### DATA_COLLECTION_FIELDS

```python
DATA_COLLECTION_FIELDS = list[dict[str, Any]]  # JSON-serializable field definitions for record types
```

---

## 14. File Index

| File | Contents |
|------|----------|
| `lib/galaxy/model/__init__.py` | Core model classes: `DatasetCollection`, `DatasetCollectionElement`, `DatasetCollectionInstance`, `HistoryDatasetCollectionAssociation`, `LibraryDatasetCollectionAssociation`, `ImplicitCollectionJobs`, `ImplicitCollectionJobsJobAssociation`, `ImplicitlyCreatedDatasetCollectionInput`, `ToolRequestImplicitCollectionAssociation`, all job association classes, workflow association classes, tag/annotation/rating associations |
| `lib/galaxy/model/dataset_collections/__init__.py` | Empty (package marker) |
| `lib/galaxy/model/dataset_collections/types/__init__.py` | `BaseDatasetCollectionType` abstract base class |
| `lib/galaxy/model/dataset_collections/types/list.py` | `ListDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/paired.py` | `PairedDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py` | `PairedOrUnpairedDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/record.py` | `RecordDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/sample_sheet.py` | `SampleSheetDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py` | `SampleSheetColumnDefinitionModel`, validation utilities for sample sheet columns and rows |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | YAML-to-Markdown doc generator for collection_semantics.yml |
| `lib/galaxy/model/dataset_collections/type_description.py` | `CollectionTypeDescription`, `CollectionTypeDescriptionFactory`, `COLLECTION_TYPE_DESCRIPTION_FACTORY`, type validation regex |
| `lib/galaxy/model/dataset_collections/registry.py` | `DatasetCollectionTypesRegistry`, `DATASET_COLLECTION_TYPES_REGISTRY` |
| `lib/galaxy/model/dataset_collections/matching.py` | `CollectionsToMatch`, `MatchingCollections` |
| `lib/galaxy/model/dataset_collections/structure.py` | `Leaf`, `UninitializedTree`, `Tree`, `get_structure`, `tool_output_to_structure` |
| `lib/galaxy/model/dataset_collections/builder.py` | `build_collection`, `set_collection_elements`, `CollectionBuilder`, `BoundCollectionBuilder` |
| `lib/galaxy/model/dataset_collections/subcollections.py` | `split_dataset_collection_instance`, `_split_dataset_collection` |
| `lib/galaxy/model/dataset_collections/adapters.py` | `CollectionAdapter`, `DCECollectionAdapter`, `PromoteCollectionElementToCollectionAdapter`, `PromoteDatasetToCollection`, `PromoteDatasetsToCollection`, `TransientCollectionAdapterDatasetInstanceElement`, `recover_adapter` |
| `lib/galaxy/model/dataset_collections/query.py` | `HistoryQuery` (matches collections to tool parameters) |
| `lib/galaxy/model/dataset_collections/auto_pairing.py` | `auto_pair()`, automatic forward/reverse pairing heuristics |
| `lib/galaxy/model/dataset_collections/auto_identifiers.py` | `filename_to_element_identifier()`, `fill_in_identifiers()` |
| `lib/galaxy/managers/collections.py` | `DatasetCollectionManager` -- primary service layer |
| `lib/galaxy/managers/hdcas.py` | `HDCAManager`, `DCESerializer`, `DCSerializer`, `DCASerializer`, `HDCASerializer` |
| `lib/galaxy/schema/schema.py` | `DatasetCollectionPopulatedState` enum, `SampleSheetColumnDefinitions`, `SampleSheetRow` types |
