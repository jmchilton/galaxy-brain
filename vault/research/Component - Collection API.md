---
type: research
subtype: component
tags:
  - research/component
  - galaxy/collections
  - galaxy/api
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - collections
  - api
related_notes:
  - "[[Component - Collection Models]]"
---

# Galaxy Dataset Collection API Layer

Comprehensive reference for the API layer that exposes Galaxy's dataset collection system. Covers endpoints, service/manager interactions, schemas, serialization, authentication, and test coverage.

---

## Table of Contents

1. [Endpoint Inventory](#1-endpoint-inventory)
2. [Dedicated Collection API -- dataset_collections.py](#2-dedicated-collection-api)
3. [History Contents API -- history_contents.py](#3-history-contents-api)
4. [Service Layer](#4-service-layer)
5. [Manager Layer (API-Relevant Parts)](#5-manager-layer)
6. [Request/Response Schemas](#6-requestresponse-schemas)
7. [Serialization Pipeline](#7-serialization-pipeline)
8. [Collection Creation -- Full Request Path](#8-collection-creation-full-request-path)
9. [Collection Access and Navigation](#9-collection-access-and-navigation)
10. [Update, Delete, and Bulk Operations](#10-update-delete-and-bulk-operations)
11. [Collection Downloads](#11-collection-downloads)
12. [Job State and Implicit Collections in API](#12-job-state-and-implicit-collections-in-api)
13. [Authentication and Authorization](#13-authentication-and-authorization)
14. [Pagination and Filtering](#14-pagination-and-filtering)
15. [Error Handling](#15-error-handling)
16. [Sample Sheet and Workbook Endpoints](#16-sample-sheet-and-workbook-endpoints)
17. [Test Coverage](#17-test-coverage)
18. [File Index](#18-file-index)

---

## 1. Endpoint Inventory

All endpoints that deal with dataset collections, across all API files.

### Dedicated Collection Endpoints (`/api/dataset_collections/...`)

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | `/api/dataset_collections` | `create` | Create a new collection instance |
| GET | `/api/dataset_collections/{hdca_id}` | `show` | Get detailed info about a collection |
| PUT | `/api/dataset_collections/{hdca_id}` | `update_collection` | Update collection attributes |
| GET | `/api/dataset_collections/{hdca_id}/contents/{parent_id}` | `contents` | Get child elements of a subcollection |
| GET | `/api/dataset_collection_element/{dce_id}` | `content` | Get a single DCE by its ID |
| GET | `/api/dataset_collections/{hdca_id}/attributes` | `attributes` | Get dbkey/extension for all elements |
| GET | `/api/dataset_collections/{hdca_id}/suitable_converters` | `suitable_converters` | Get applicable converters |
| POST | `/api/dataset_collections/{hdca_id}/copy` | `copy` | Copy collection with new dbkey |
| GET | `/api/dataset_collections/{hdca_id}/download` | `download` | Download as zip archive |
| POST | `/api/dataset_collections/{hdca_id}/prepare_download` | `prepare_download` | Async prepare zip download |

### Sample Sheet / Workbook Endpoints

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| POST | `/api/sample_sheet_workbook` | `create_workbook` | Generate XLSX for sample sheet definition |
| POST | `/api/sample_sheet_workbook/parse` | `parse_workbook` | Parse XLSX workbook |
| POST | `/api/dataset_collections/{hdca_id}/sample_sheet_workbook` | `create_workbook_for_collection` | Generate XLSX targeting existing collection |
| POST | `/api/dataset_collections/{hdca_id}/sample_sheet_workbook/parse` | `parse_workbook_for_collection` | Parse XLSX for existing collection |

### History Contents Endpoints (Collection-Relevant)

| Method | Path | Operation | Description |
|--------|------|-----------|-------------|
| GET | `/api/histories/{history_id}/contents` | `index` | List history contents (HDAs + HDCAs) |
| GET | `/api/histories/{history_id}/contents/{type}s` | `index_typed` | List filtered by type (datasets or dataset_collections) |
| GET | `/api/histories/{history_id}/contents/{type}s/{id}` | `show` | Get detail for HDA or HDCA |
| POST | `/api/histories/{history_id}/contents/{type}s` | `create_typed` | Create HDA or HDCA in history |
| POST | `/api/histories/{history_id}/contents` | `create` (deprecated) | Create HDA or HDCA |
| PUT | `/api/histories/{history_id}/contents/{type}s/{id}` | `update_typed` | Update HDA or HDCA |
| DELETE | `/api/histories/{history_id}/contents/{type}s/{id}` | `delete_typed` | Delete HDA or HDCA |
| PUT | `/api/histories/{history_id}/contents` | `update_batch` | Batch update multiple items |
| PUT | `/api/histories/{history_id}/contents/bulk` | `bulk_operation` | Bulk ops (hide, delete, tag, etc.) |
| GET | `/api/histories/{history_id}/contents/{type}s/{id}/jobs_summary` | `show_jobs_summary` | Job state summary for HDCA |
| GET | `/api/histories/{history_id}/jobs_summary` | `index_jobs_summary` | Batch job state summaries |
| GET | `/api/histories/{history_id}/contents/dataset_collections/{hdca_id}/download` | `download` | Download collection as zip |
| POST | `/api/histories/{history_id}/contents/dataset_collections/{hdca_id}/prepare_download` | `prepare_download` | Async prepare download |
| POST | `/api/histories/{history_id}/contents/{type}s/{id}/prepare_store_download` | `prepare_store_download` | Export-style download (model store) |
| POST | `/api/histories/{history_id}/contents/{type}s/{id}/write_store` | `write_store` | Write to external URI |
| POST | `/api/histories/{history_id}/copy_contents` | `copy_contents` | Copy datasets/collections between histories |

---

## 2. Dedicated Collection API

**File:** `lib/galaxy/webapps/galaxy/api/dataset_collections.py`

This file defines `FastAPIDatasetCollections`, a class-based view (CBV) using FastAPI's router. It delegates entirely to `DatasetCollectionsService`.

### POST `/api/dataset_collections` -- Create

**Request body:** `CreateNewCollectionPayload` (Pydantic model).

Key fields:
- `collection_type` (str): e.g. `"list"`, `"paired"`, `"list:paired"`, `"sample_sheet"`
- `element_identifiers` (list): Elements to include, each with `name`, `src` (`hda`/`ldda`/`hdca`/`new_collection`), `id`, optional `tags`, optional nested `element_identifiers`
- `instance_type`: `"history"` (default) or `"library"`
- `history_id`: Required when `instance_type == "history"`
- `folder_id`: Required when `instance_type == "library"`
- `name`: Collection name
- `hide_source_items`, `copy_elements`: Behavioral flags
- `fields`: For `record` type, field definitions (or `"auto"`)
- `column_definitions`, `rows`: For `sample_sheet` type

**Response:** `HDCADetailed` -- full collection representation including elements.

**Flow:** Service layer calls `api_payload_to_create_params()` to extract/validate params, then `DatasetCollectionManager.create()`.

### GET `/api/dataset_collections/{hdca_id}` -- Show

**Query params:** `instance_type` (history/library), `view` (element/element-reference/collection)

**Response:** `AnyHDCA` = `Union[HDCACustom, HDCADetailed, HDCASummary]`

The `view` parameter controls the level of detail:
- `"element"` -- Full element details including nested HDA metadata (default)
- `"element-reference"` -- Minimal element info (id, state, type) for efficient UI rendering
- `"collection"` -- No element information at all

### GET `/api/dataset_collections/{hdca_id}/contents/{parent_id}` -- Contents

Paginated child elements of a specific (sub)collection within an HDCA. Used for lazy-loading nested collections.

**Query params:** `limit`, `offset`, `instance_type`

**Response:** `DatasetCollectionContentElements` (root model wrapping `list[DCESummary]`)

Security: validates that `parent_id` is a subcollection within the given `hdca_id` using `hdca.contains_collection(parent_id)` (recursive CTE query).

For subcollection elements, the response includes a `contents_url` for further drill-down navigation.

### GET `/api/dataset_collection_element/{dce_id}` -- Single Element

Returns a single `DCESummary` for a `DatasetCollectionElement` by its ID. Security check uses `security_agent.can_access_collection()` on the parent or child collection.

### GET `/api/dataset_collections/{hdca_id}/attributes` -- Attributes

Returns `DatasetCollectionAttributesResult` containing `dbkey`, `extension`, plus sets of all `dbkeys` and `extensions` in the collection.

### GET `/api/dataset_collections/{hdca_id}/suitable_converters` -- Converters

Returns `SuitableConverters` -- list of tools that can convert all datatypes in the collection. Uses set intersection across all leaf dataset extensions to find converters applicable to the entire collection.

### POST `/api/dataset_collections/{hdca_id}/copy` -- Copy with Attributes

Copies entire collection with new `dbkey`. Returns 204 No Content.

---

## 3. History Contents API

**File:** `lib/galaxy/webapps/galaxy/api/history_contents.py`

Defines `FastAPIHistoryContents`. Collections appear as `HistoryContentType.dataset_collection` items in history contents. Many endpoints are polymorphic -- they handle both HDAs and HDCAs based on the `type` parameter.

### Index/Listing

Two versions:
1. **Legacy** (`v` param unset): Uses `History.contents_iter()` with filter params (`ids`, `types`, `deleted`, `visible`, `shareable`). Collections serialized via `dictify_dataset_collection_instance`.
2. **Dev** (`v=dev`): Uses `HistoryContentsManager.contents()` with ORM filter chain. Collections serialized via `HDCASerializer`.

Collections in listings use `"summary"` or `"collection"` view (no elements). Only when `dataset_details="all"` or a specific ID matches does the listing use `"element"` view.

Supports `Accept: application/vnd.galaxy.history.contents.stats+json` to return `HistoryContentsWithStatsResult` which includes total match count and requests `elements_datatypes` key in serialization.

### Show

```
GET /api/histories/{history_id}/contents/dataset_collections/{id}
```

Supports `fuzzy_count` parameter for large collections -- a heuristic to limit how many elements are returned at each nesting level. See `gen_rank_fuzzy_counts()` in `collections_util.py`. This is explicitly not a stable API -- it provides a best-effort "balanced start" of large collections for UI rendering.

### Create (Collections via History Contents)

```
POST /api/histories/{history_id}/contents/dataset_collections
```

When `type=dataset_collection`, routes to `__create_dataset_collection()`:
- If `source=new_collection` (default): calls `DatasetCollectionManager.create()` with params from `api_payload_to_create_params()`
- If `source=hdca`: calls `DatasetCollectionManager.copy()` to copy an existing collection into the target history, optionally with `copy_elements=True` and `dbkey` override

### Update

```
PUT /api/histories/{history_id}/contents/dataset_collections/{id}
```

Delegates to `DatasetCollectionManager.update()`. For anonymous users, only `deleted` and `visible` are allowed. For authenticated users:
- `name` -- validated and sanitized
- `deleted`, `visible` -- boolean validation
- `tags` -- sanitized string list
- `annotation` -- stored via annotation system

### Delete

```
DELETE /api/histories/{history_id}/contents/dataset_collections/{id}
```

Supports `recursive`, `purge`, `stop_job` flags. Delegates to `DatasetCollectionManager.delete()`:
- Sets `deleted=True` on the HDCA
- If `recursive=True`: iterates all leaf datasets and deletes them
- If `purge=True`: also purges each leaf dataset

### Bulk Operations

```
PUT /api/histories/{history_id}/contents/bulk
```

Operations that affect collections:
- `hide`/`unhide` -- sets `visible` flag
- `delete` -- calls `DatasetCollectionManager.delete(recursive=True)`
- `undelete` -- via `HDCAManager.undelete()`
- `purge` -- calls `DatasetCollectionManager.delete(recursive=True, purge=True)`
- `change_datatype` -- chains Celery tasks for all leaf datasets
- `change_dbkey` -- sets dbkey on all leaf datasets
- `add_tags`/`remove_tags` -- via tag handler

---

## 4. Service Layer

### DatasetCollectionsService

**File:** `lib/galaxy/webapps/galaxy/services/dataset_collections.py`

Thin service that mediates between API endpoints and managers.

**Dependencies:** `HistoryManager`, `HDAManager`, `HDCAManager`, `DatasetCollectionManager`, `Registry` (datatypes)

Key methods map directly to endpoints:
- `create()` -- validates instance_type, resolves parent (history or library folder), calls `DatasetCollectionManager.create()`, serializes result via `dictify_dataset_collection_instance()`
- `show()` -- gets HDCA/LDCA via `DatasetCollectionManager.get_dataset_collection_instance()`, serializes with chosen view
- `contents()` -- validates HDCA, checks subcollection membership, gets elements via `DatasetCollectionManager.get_collection_contents()`, serializes each element via `dictify_element_reference()`
- `dce_content()` -- direct session lookup of `DatasetCollectionElement`, access check via `security_agent.can_access_collection()`
- `attributes()` -- calls `dataset_collection_instance.to_dict(view="dbkeysandextensions")`
- `copy()` -- delegates to `DatasetCollectionManager.copy()`
- `suitable_converters()` -- delegates to `DatasetCollectionManager.get_converters_for_collection()`

### HistoriesContentsService

**File:** `lib/galaxy/webapps/galaxy/services/history_contents.py`

Handles polymorphic history content operations. Collection-relevant methods:

- `__show_dataset_collection()` -- gets accessible collection, serializes with `dictify_dataset_collection_instance()` using view param and fuzzy_count
- `__create_dataset_collection()` -- routes to `DatasetCollectionManager.create()` or `.copy()` based on source
- `__update_dataset_collection()` -- delegates to `DatasetCollectionManager.update()`
- `show_jobs_summary()` -- for collections, checks `job_source_type` (Job or ImplicitCollectionJobs) and returns state summary
- `get_dataset_collection_archive_for_download()` -- streams collection as zip via `hdcas.stream_dataset_collection()`
- `prepare_collection_download()` -- async version using Celery task

---

## 5. Manager Layer

### DatasetCollectionManager

**File:** `lib/galaxy/managers/collections.py`

The central service object for all collection operations. Not a typical `ModelManager` subclass -- it directly manages creation, access, matching, and rule-based building.

**Key methods exposed to API:**

`get_dataset_collection_instance(trans, instance_type, id, check_ownership=False, check_accessible=True)`:
- For `"history"`: loads HDCA by ID, checks history ownership/accessibility
- For `"library"`: loads LDCA by ID, checks library accessibility via security agent
- Overloaded with type hints to return the correct type

`create(trans, parent, name, collection_type, element_identifiers=None, elements=None, ...)`:
- Entry point for all user-initiated collection creation
- Validates identifiers (unless `trusted_identifiers`)
- Creates `DatasetCollection` via `create_dataset_collection()`
- Creates HDCA or LDCA instance
- Handles tags, implicit inputs, implicit output name

`create_dataset_collection(trans, collection_type, element_identifiers=None, elements=None, ...)`:
- Core collection building logic
- Resolves element identifiers to actual objects (`__load_elements()`)
- For nested collections, recursively creates subcollections
- Calls `builder.build_collection()` with the type plugin

`update(trans, instance_type, id, payload)`:
- Validates and parses update payload
- Delegates to `dataset_collection_instance.set_from_dict()` for model fields
- Handles annotations and tags separately

`delete(trans, instance_type, id, recursive=False, purge=False)`:
- Sets deleted flag
- If recursive: iterates all leaf datasets, verifying ownership for each
- If purge: purges each leaf dataset

`get_collection_contents(trans, parent_id, limit=None, offset=None)`:
- SQL query on `DatasetCollectionElement` table filtered by `dataset_collection_id`
- Ordered by `element_index`
- Eager loads `child_collection` and `hda` relationships

`match_collections(collections_to_match)`:
- Delegates to `MatchingCollections.for_collections()` -- used during tool execution, not directly by API

`apply_rules(hdca, rule_set, handle_dataset)`:
- Rule-based collection manipulation
- Flattens collection to tabular data + sources, applies rules, builds new elements

### HDCAManager

**File:** `lib/galaxy/managers/hdcas.py`

Standard Galaxy model manager for HDCAs. Extends `ModelManager`, `AccessibleManagerMixin`, `OwnableManagerMixin`, `PurgableManagerMixin`, `AnnotatableManagerMixin`.

`is_owner(item, user, **kwargs)`:
- Checks `item.history.user == user`
- For anonymous users: checks `item.history == kwargs.get("history")`

`map_datasets(content, fn, *parents)`:
- Recursive walker over all datasets in a collection
- Used by bulk operations to apply changes to every leaf dataset

---

## 6. Request/Response Schemas

**File:** `lib/galaxy/schema/schema.py`

### Core Enums

```python
DatasetCollectionInstanceType = Literal["history", "library"]

class DatasetCollectionPopulatedState(str, Enum):
    NEW = "new"
    OK = "ok"
    FAILED = "failed"

class DCEType(str, Enum):
    hda = "hda"
    dataset_collection = "dataset_collection"

class CollectionSourceType(str, Enum):
    hda = "hda"
    ldda = "ldda"
    hdca = "hdca"
    new_collection = "new_collection"
```

### Request Models

**`CreateNewCollectionPayload`** -- POST body for creating collections:
- `collection_type`: Optional[str] -- e.g. "list", "paired", "list:paired", "sample_sheet"
- `element_identifiers`: Optional[list[CollectionElementIdentifier]]
- `name`, `hide_source_items`, `copy_elements`
- `instance_type`: "history" or "library"
- `history_id`, `folder_id`
- `fields`: For record type
- `column_definitions`, `rows`: For sample_sheet type

**`CollectionElementIdentifier`** (in history_contents service):
- `name`, `src` (CollectionSourceType), `id`, `tags`
- `element_identifiers`: For nested `new_collection` src (self-referencing)
- `collection_type`: For nested collections

**`UpdateHistoryContentsPayload`** -- PUT body for updates (shared with HDAs):
- Flexible payload, used with `model_dump(exclude_unset=True)`

**`DeleteHistoryContentPayload`** -- DELETE body:
- `purge`, `recursive`, `stop_job` booleans

### Response Models

**`DCSummary`** -- DatasetCollection summary:
- `id`, `create_time`, `update_time`, `collection_type`, `populated_state`, `populated_state_message`, `element_count`

**`DCDetailed`** extends DCSummary:
- `populated` (bool), `elements` (list[DCESummary])

**`DCESummary`** -- DatasetCollectionElement:
- `id`, `element_index`, `element_identifier`, `element_type` (DCEType)
- `object`: Union[HDAObject, HDADetailed, DCObject] -- actual content
- `columns`: Optional sample sheet row data

**`DCObject`** -- Nested DatasetCollection as element:
- `id`, `collection_type`, `populated`, `element_count`
- `contents_url`: Optional URL for drill-down
- `elements`: list[DCESummary] (recursive)
- `elements_states`, `elements_deleted`, `elements_datatypes`: Summary stats

**`HDAObject`** -- Dataset as element:
- `id`, `state`, `hda_ldda`, `history_id`, `tags`, `purged`
- `accessible`: Optional (set during contents serialization)

**`HDCASummary`** -- HDCA summary (used in listings):
- `id`, `name`, `hid`, `history_id`, `collection_id`
- `history_content_type`: Always `"dataset_collection"`
- `type`: Always `"collection"`
- `collection_type`, `populated_state`, `populated_state_message`, `element_count`
- `elements_datatypes`, `elements_states`, `elements_deleted`
- `job_source_id`, `job_source_type`, `job_state_summary`
- `deleted`, `visible`, `create_time`, `update_time`
- `tags`, `url`, `contents_url`
- `store_times_summary`

**`HDCADetailed`** extends HDCASummary:
- `populated` (bool)
- `elements` (list[DCESummary])
- `implicit_collection_jobs_id`
- `column_definitions` (for sample_sheet type)

**`AnyHDCA`** = Union[HDCACustom, HDCADetailed, HDCASummary]

---

## 7. Serialization Pipeline

There are two serialization paths for collections:

### Path 1: `dictify_dataset_collection_instance()` (collections_util.py)

Used by `DatasetCollectionsService` and `HistoriesContentsService.__collection_dict()`.

```
dictify_dataset_collection_instance(hdca, parent, security, url_builder, view, fuzzy_count)
    |
    ├── hdca.to_dict(view=hdca_view)  -- base model serialization
    |
    ├── Compute URL and contents_url
    |
    ├── If view in ("element", "element-reference"):
    |     ├── gen_rank_fuzzy_counts(collection_type, fuzzy_count)
    |     ├── get_fuzzy_count_elements(collection, rank_fuzzy_counts)
    |     └── For each element:
    |           ├── dictify_element(element, ...)    # full view
    |           └── dictify_element_reference(...)    # reference view
    |
    └── Attach implicit_collection_jobs_id
```

**`dictify_element()`**: Full recursive serialization. Calls `element_object.to_dict()` for datasets (includes all HDA metadata). For subcollections, recursively serializes nested elements.

**`dictify_element_reference()`**: Lightweight serialization. For datasets: just `id`, `model_class`, `state`, `hda_ldda`, `purged`, `history_id`, `tags`. For subcollections: `collection_type`, `element_count`, `populated`, `elements_states`, `elements_deleted`, `elements_datatypes`, plus recursive nested elements.

### Path 2: `HDCASerializer` (hdcas.py)

Used by `HistoriesContentsService._serialize_content_item()` (v2 index).

Standard Galaxy serializer framework with view-based key selection:

**Summary view keys:** `id`, `type_id`, `name`, `history_id`, `collection_id`, `hid`, `history_content_type`, `collection_type`, `populated_state`, `populated_state_message`, `element_count`, `elements_datatypes`, `elements_deleted`, `elements_states`, `job_source_id`, `job_source_type`, `job_state_summary`, `deleted`, `visible`, `type`, `url`, `create_time`, `update_time`, `tags`, `contents_url`, `store_times_summary`

**Detailed view adds:** `populated`, `elements`

Collection-proxied keys (delegated to `DCSerializer`): `create_time`, `update_time`, `collection_type`, `populated`, `populated_state`, `populated_state_message`, `elements`, `element_count`.

The `elements` serializer recursively uses `DCESerializer`, which delegates to `HDASerializer` for dataset elements and `DCSerializer` for subcollection elements.

### Fuzzy Count Mechanism

`gen_rank_fuzzy_counts(collection_type, fuzzy_count)` converts a global element budget into per-rank limits:
- `paired` ranks always get 2
- `list` ranks split the remaining budget by nth-root
- The goal is balanced representation across nesting levels
- Example: `list:paired` with fuzzy_count=100 -> `[~50, 2]`

This is explicitly unstable / heuristic. The only guarantee is the API won't return orders of magnitude more elements than the requested fuzzy_count.

---

## 8. Collection Creation -- Full Request Path

### Via `/api/dataset_collections` (Direct)

```
Client POST /api/dataset_collections
  { collection_type: "list:paired",
    element_identifiers: [...],
    instance_type: "history",
    history_id: "abc123",
    name: "My Collection" }
    │
    ▼
FastAPIDatasetCollections.create()
    │
    ▼
DatasetCollectionsService.create(trans, payload)
    │
    ├── api_payload_to_create_params(payload)
    │     ├── Validates required: collection_type, element_identifiers
    │     ├── validate_column_definitions() if sample_sheet
    │     └── Returns dict with: collection_type, element_identifiers, name,
    │         hide_source_items, copy_elements, fields, column_definitions, rows
    │
    ├── Resolve parent:
    │   ├── history: HistoryManager.get_mutable(history_id, user)
    │   └── library: get_library_folder + check_user_can_add_to_library_item
    │
    ▼
DatasetCollectionManager.create(trans, parent, name, collection_type, element_identifiers, ...)
    │
    ├── validate_input_element_identifiers(element_identifiers)
    │     ├── Check no __object__ key (injection prevention)
    │     ├── Check all have "name" field
    │     ├── Check no duplicate names
    │     ├── Check src in (hda, hdca, ldda, new_collection)
    │     └── Recursive validation for new_collection children
    │
    ├── create_dataset_collection(trans, collection_type, element_identifiers, ...)
    │     │
    │     ├── CollectionTypeDescriptionFactory.for_collection_type(collection_type)
    │     │
    │     ├── _element_identifiers_to_elements()
    │     │     │
    │     │     ├── If nested: __recursively_create_collections_for_identifiers()
    │     │     │     └── For each src="new_collection": recursive create_dataset_collection()
    │     │     │
    │     │     └── __load_elements()
    │     │           └── For each identifier:
    │     │                 ├── src="hda": hda_manager.get_accessible() [+ copy if copy_elements]
    │     │                 ├── src="ldda": ldda_manager.get() -> to_history_dataset_association()
    │     │                 ├── src="hdca": __get_history_collection_instance().collection
    │     │                 └── Apply tags from identifier
    │     │
    │     ├── builder.build_collection(type_plugin, elements)
    │     │     └── type_plugin.generate_elements(elements)
    │     │           └── Yields DatasetCollectionElement objects
    │     │
    │     └── Set collection_type on DatasetCollection
    │
    ├── _create_instance_for_collection(trans, parent, name, collection, ...)
    │     ├── Create HDCA (or LDCA for library)
    │     ├── Set implicit_input_collections if applicable
    │     ├── parent.add_dataset_collection() -- assigns HID
    │     └── Apply tags (list of strings or dict of tag objects)
    │
    └── __persist() -- session.add() + session.commit()
```

### Via History Contents API (Copy)

```
POST /api/histories/{history_id}/contents/dataset_collections
  { type: "dataset_collection", source: "hdca", content: "encoded_hdca_id",
    copy_elements: true, dbkey: "hg38" }
    │
    ▼
HistoriesContentsService.__create_dataset_collection()
    │
    ▼
DatasetCollectionManager.copy(trans, parent=history, source="hdca",
                              encoded_source_id, copy_elements=True,
                              dataset_instance_attributes={dbkey: "hg38"})
    │
    ├── __get_history_collection_instance(trans, encoded_source_id)
    ├── source_hdca.copy(element_destination=history, dataset_instance_attributes=...)
    ├── new_hdca.copy_tags_from(source=source_hdca)
    └── session.commit()
```

---

## 9. Collection Access and Navigation

### Fetching a Collection

```
GET /api/dataset_collections/{hdca_id}?view=element
```

Returns `HDCADetailed` with full element tree. For very large collections, use `view=element-reference` for lighter payloads, or `view=collection` to skip elements entirely.

### Fetching via History Contents

```
GET /api/histories/{history_id}/contents/dataset_collections/{hdca_id}?fuzzy_count=100
```

The `fuzzy_count` parameter limits elements at each level. For `list:paired` with `fuzzy_count=100`, approximately 50 list elements are returned, each with their full 2 paired elements.

### Navigating Nested Collections

Step 1: Get the HDCA with elements or get `contents_url`:
```
GET /api/histories/{history_id}/contents?v=dev&view=summary&keys=contents_url
```

Step 2: Use `contents_url` to get root elements:
```
GET /api/dataset_collections/{hdca_id}/contents/{collection_id}
```

Step 3: For subcollections, each element's `object.contents_url` provides the next level:
```
GET /api/dataset_collections/{hdca_id}/contents/{child_collection_id}
```

This supports pagination with `limit` and `offset` at each level.

### Accessing Individual Elements

```
GET /api/dataset_collection_element/{dce_id}
```

Returns `DCESummary` for any element by its ID. Access checked via the parent collection's permissions.

---

## 10. Update, Delete, and Bulk Operations

### Update

```
PUT /api/dataset_collections/{hdca_id}
  { name: "New Name", tags: ["tag1", "tag2"], visible: false }
```

Or via history contents:
```
PUT /api/histories/{history_id}/contents/dataset_collections/{hdca_id}
  { name: "New Name" }
```

Allowed fields:
- `name` -- sanitized string
- `deleted` -- boolean
- `visible` -- boolean
- `tags` -- list of strings (calls `tag_handler.set_tags_from_list()`)
- `annotation` -- text

Anonymous users can only update `deleted` and `visible`.

### Delete

```
DELETE /api/histories/{history_id}/contents/dataset_collections/{hdca_id}
```

Payload/query options:
- `recursive` (bool, deprecated as query param): also delete leaf datasets
- `purge` (bool, deprecated as query param): purge leaf datasets from disk
- `stop_job` (bool, deprecated as query param): stop creating job

Returns 202 (accepted, async purge) or 204 (immediate).

### Batch Update

```
PUT /api/histories/{history_id}/contents
  { items: [{ id: "...", history_content_type: "dataset_collection" }],
    visible: false }
```

Applies same payload to all listed items. HDCAs updated via `DatasetCollectionManager.update()`.

### Bulk Operations

```
PUT /api/histories/{history_id}/contents/bulk
  { operation: "delete",
    items: [{ id: "...", history_content_type: "dataset_collection" }] }
```

Or with filter-based selection (no explicit items, uses filter query params).

Operations and their effect on collections:
- `hide`/`unhide`: sets `visible` on HDCA
- `delete`: recursive delete of HDCA + all leaf datasets
- `undelete`: undeletes HDCA (fails if purged)
- `purge`: recursive delete + purge of all leaf datasets
- `change_datatype`: chains Celery tasks for all leaf datasets, then touches HDCA
- `change_dbkey`: sets dbkey on all leaf dataset instances
- `add_tags`/`remove_tags`: modifies HDCA tags

---

## 11. Collection Downloads

### Synchronous Download

```
GET /api/dataset_collections/{hdca_id}/download
GET /api/histories/{history_id}/contents/dataset_collections/{hdca_id}/download
```

Returns `StreamingResponse` with zip archive. Structure:
- Collection name as root directory
- Elements named by element_identifier + file extension
- Nested collections create subdirectories

Uses `ZipstreamWrapper` for streaming. Skips datasets not in `ok` state or that are purged.

**Prerequisite:** Collection must be fully populated (`populated_optimized == True`), otherwise raises 400.

### Async Download

```
POST /api/dataset_collections/{hdca_id}/prepare_download
```

Returns `AsyncFile` with `storage_request_id`. Uses Celery task `prepare_dataset_collection_download`. Client polls short-term storage API for completion.

### Export-Style Download

```
POST /api/histories/{history_id}/contents/dataset_collections/{id}/prepare_store_download
  { model_store_format: "tar.gz", include_files: true }
```

Exports collection as a Galaxy model store archive (tar.gz, rocrate, etc.).

---

## 12. Job State and Implicit Collections in API

### Job State Summary

```
GET /api/histories/{history_id}/contents/dataset_collections/{id}/jobs_summary
```

Returns `AnyJobStateSummary`. For implicit collections (created by map-over):
- Checks `job_source_type`: either `"Job"` (single job) or `"ImplicitCollectionJobs"` (job group)
- Returns aggregate state counts across all jobs in the group

### Batch Job State Polling

```
GET /api/histories/{history_id}/jobs_summary?ids=id1,id2&types=ImplicitCollectionJobs,Job
```

Efficient bulk lookup. IDs and types arrays must have same length. Uses `fetch_job_states()` for efficient SQL.

### How Implicit Collections Appear in API Responses

`HDCASummary` / `HDCADetailed` always include:
- `job_source_id`: encoded ID of the Job or ImplicitCollectionJobs
- `job_source_type`: `"Job"` or `"ImplicitCollectionJobs"` or null
- `job_state_summary`: `HDCJobStateSummary` with counts per job state (new, waiting, running, ok, error, paused, etc.)
- `implicit_collection_jobs_id` (detailed view only)

These fields allow the UI to track progress of implicit collection population. The `populated_state` field indicates whether the collection structure itself is finalized:
- `"new"` -- elements not yet fully determined
- `"ok"` -- all elements present (though individual datasets may still be running)
- `"failed"` -- collection population failed

---

## 13. Authentication and Authorization

### Access Control Model

All collection access goes through history/library access checks:

1. **History collections (HDCA):**
   - `get_dataset_collection_instance()` calls `history_manager.error_unless_accessible()` or `error_unless_owner()` depending on `check_ownership` flag
   - Most read operations use `check_accessible=True` (allows shared histories)
   - Write operations (update, delete, copy) use `check_ownership=True`

2. **Library collections (LDCA):**
   - Uses `security_agent.can_access_library_item()` for access checks
   - Ownership checks for library collections are not yet implemented (raises `NotImplementedError`)

3. **Element-level access:**
   - `dce_content()` checks `security_agent.can_access_collection()` on the DCE's parent or child collection
   - This checks dataset permissions for all leaf datasets in the collection
   - Admin users bypass element-level checks

4. **Anonymous users:**
   - Can access their current history's contents
   - Limited to `deleted` and `visible` updates only
   - Ownership verified by `history == current_history` when `history.user is None`

### Security Patterns

- Collection creation requires mutable history access: `history_manager.get_mutable()`
- `hide_source_items` requires ownership of each source HDA
- Recursive delete verifies ownership of each leaf dataset before deletion
- `hda_manager.get_accessible()` used when resolving element identifiers (allows referencing accessible-but-not-owned datasets)
- Job state summary intentionally has no access checks -- considered non-sensitive data for efficiency

---

## 14. Pagination and Filtering

### Collection Contents Pagination

```
GET /api/dataset_collections/{hdca_id}/contents/{parent_id}?limit=20&offset=0
```

Direct SQL `LIMIT`/`OFFSET` on `DatasetCollectionElement` query, ordered by `element_index`.

### History Contents Filtering

Collections appear alongside datasets in history contents. The v2 index supports:
- Standard filter params via `FilterQueryParams` (`q`, `qv`, `offset`, `limit`, `order`)
- Ordering by `hid-asc` (default) or other fields
- Type filtering: `?types=dataset_collection` restricts to HDCAs only

Legacy index supports:
- `types`: comma-separated list including `"dataset_collection"`
- `ids`: specific encoded IDs
- `deleted`, `visible`: boolean filters
- `shareable`: filter by object store shareability

### Fuzzy Count (Large Collection Handling)

Not true pagination -- a heuristic budget for the show endpoint:
```
GET /api/histories/{history_id}/contents/dataset_collections/{id}?fuzzy_count=500
```

Distributes an element budget across nesting levels. For `list:list:list` with `fuzzy_count=1000`:
- Each list rank gets approximately `cube_root(1000) + 1 = 11` elements

---

## 15. Error Handling

### Validation Errors

**Element identifier validation** (`validate_input_element_identifiers()`):
- Missing `name` field -> 400
- Duplicate `name` values -> 400
- Unknown `src` type -> 400
- `__object__` key present (injection) -> 400
- Missing `element_identifiers` for `new_collection` -> 400
- Missing `collection_type` for `new_collection` -> 400

**Creation errors:**
- Missing `collection_type` -> 400 (ERROR_NO_COLLECTION_TYPE)
- Missing `element_identifiers` and no `elements` -> 400 (ERROR_INVALID_ELEMENTS_SPECIFICATION)
- Missing `history_id` when `instance_type="history"` -> 400
- Record type without `fields` -> 400

**Column definition validation** (sample_sheet):
- Invalid type -> 400
- Missing required keys -> 400
- Invalid validators -> 400
- Row data mismatching column definitions -> 400

### Access Errors

- History not accessible -> 403 (ItemAccessibilityException)
- History not owned (for mutations) -> 403
- Collection not found -> 400 (RequestParameterInvalidException with "not found" message)
- Library collection not accessible -> 403
- HDA not accessible during element resolution -> 403

### Containment Errors

- `contents` endpoint with `parent_id` not contained in HDCA -> 404 (ObjectNotFound)

### Population Errors

- Download of unpopulated collection -> 400 (RequestParameterInvalidException)
- Serialization failure when collection not populated -> logs exception and re-raises ValidationError

---

## 16. Sample Sheet and Workbook Endpoints

Sample sheets are a collection type where each element carries row-level metadata (`columns` field on DCE). The API includes workbook endpoints for Excel-based data entry.

### Create Workbook

```
POST /api/sample_sheet_workbook
  { title: "...", column_definitions: [...] }
```

Returns XLSX file as `StreamingResponse`. No collection needed -- just generates a template.

### Create Workbook for Existing Collection

```
POST /api/dataset_collections/{hdca_id}/sample_sheet_workbook
  { column_definitions: [...], prefix_values: [...] }
```

Pre-fills the workbook with element identifiers from the existing collection.

### Parse Workbook

```
POST /api/sample_sheet_workbook/parse
  { content: "base64-encoded-xlsx", column_definitions: [...], collection_type: "..." }
```

Returns `ParsedWorkbook` with `rows` extracted from the XLSX.

### Parse Workbook for Existing Collection

```
POST /api/dataset_collections/{hdca_id}/sample_sheet_workbook/parse
  { content: "base64-encoded-xlsx", column_definitions: [...] }
```

Returns `ParsedWorkbookForCollection` -- includes `rows` plus `elements` from the existing collection, allowing the client to map rows to collection elements.

---

## 17. Test Coverage

**File:** `lib/galaxy_test/api/test_dataset_collections.py`

### Test Inventory

| Test | What It Covers |
|------|---------------|
| `test_create_pair_from_history` | Create paired collection via fetch API |
| `test_create_list_from_history` | Create list collection via direct POST |
| `test_create_list_of_existing_pairs` | Reference existing HDCA as element (src=hdca) |
| `test_create_list_of_new_pairs` | Nested collection creation (list:paired with new subcollections) |
| `test_create_paried_or_unpaired` | paired_or_unpaired collection with single "unpaired" element |
| `test_create_record` | Record collection with explicit fields |
| `test_record_requires_fields` | 400 when record type without fields |
| `test_record_auto_fields` | Auto-detect fields from identifiers |
| `test_record_field_validation` | Rejects wrong field count/names |
| `test_sample_sheet_*` (7 tests) | Sample sheet creation, column definitions, validation, nested sample sheets |
| `test_workbook_download` | XLSX generation |
| `test_workbook_download_for_collection` | XLSX generation from existing collection |
| `test_workbook_parse` | XLSX parsing |
| `test_workbook_parse_for_collection` | XLSX parsing with collection context |
| `test_list_download` | Download list as zip |
| `test_pair_download` | Download pair as zip |
| `test_list_pair_download` | Download list:paired as zip |
| `test_list_list_download` | Download list:list as zip |
| `test_list_list_list_download` | Download list:list:list as zip |
| `test_download_non_english_characters` | Non-ASCII collection names in zip |
| `test_hda_security` | 403 when element is inaccessible to another user |
| `test_dataset_collection_element_security` | DCE endpoint security for nested collections |
| `test_enforces_unique_names` | 400 on duplicate element identifiers |
| `test_upload_collection` | Fetch API collection upload with tags |
| `test_upload_nested` | Fetch API nested collection upload |
| `test_upload_collection_from_url` | Upload from base64 URL |
| `test_upload_collection_deferred` | Deferred dataset in collection |
| `test_upload_collection_failed_expansion_url` | Failed bagit expansion |
| `test_upload_flat_sample_sheet` | Fetch API sample sheet upload |
| `test_upload_sample_sheet_paired` | Fetch API sample_sheet:paired upload |
| `test_collection_contents_security` | 403 on contents of non-owned collection |
| `test_published_collection_contents_accessible` | Contents accessible in published history |
| `test_collection_contents_invalid_collection` | 404 for invalid subcollection ID |
| `test_show_dataset_collection` | GET show endpoint basic functionality |
| `test_show_dataset_collection_contents` | Contents endpoint with drill-down |
| `test_collection_contents_limit_offset` | Pagination params on contents |
| `test_collection_contents_empty_root` | Empty collection contents |
| `test_get_suitable_converters_*` (3 tests) | Converter intersection logic |
| `test_collection_tools_tag_propagation` | Tags propagated through tool execution |

### Testing Patterns

- **Populator objects:** `DatasetCollectionPopulator` and `DatasetPopulator` provide helper methods for creating test data
- **Fetch API usage:** Many tests use `dataset_populator.fetch(payload)` (tools/fetch endpoint) instead of direct collection creation
- **Wait patterns:** `wait_for_fetched_collection()` polls until collection is populated
- **Response validation:** `_check_create_response()` verifies 200 status and required keys (`elements`, `url`, `name`, `collection_type`, `element_count`)
- **Security tests:** Use `_different_user()` context manager to test access control
- **Helper pattern:** `_create_collection_contents_pair()` creates a simple collection and returns (hdca_dict, contents_url) for reuse

### Coverage Gaps (Observed)

- No explicit test for library collection creation/access
- No test for `PUT /api/dataset_collections/{id}` (direct update)
- No test for `POST /api/dataset_collections/{id}/copy` (copy with attributes)
- No explicit test for the `fuzzy_count` parameter behavior
- No test for `GET /api/dataset_collections/{id}/attributes`
- Bulk operations on collections tested elsewhere in history contents tests

---

## 18. File Index

| File | Contents |
|------|----------|
| `lib/galaxy/webapps/galaxy/api/dataset_collections.py` | FastAPI endpoints for `/api/dataset_collections/` and `/api/dataset_collection_element/` and `/api/sample_sheet_workbook/` |
| `lib/galaxy/webapps/galaxy/api/history_contents.py` | FastAPI endpoints for `/api/histories/{id}/contents/` including collection-typed operations and download endpoints |
| `lib/galaxy/webapps/galaxy/api/common.py` | Shared path/query param definitions: `HistoryHDCAIDPathParam`, `DatasetCollectionElementIdPathParam`, `serve_workbook()` |
| `lib/galaxy/webapps/galaxy/services/dataset_collections.py` | `DatasetCollectionsService` -- service layer for dedicated collection endpoints. Also defines `UpdateCollectionAttributePayload`, `DatasetCollectionAttributesResult`, `SuitableConverters`, `DatasetCollectionContentElements`, workbook API models |
| `lib/galaxy/webapps/galaxy/services/history_contents.py` | `HistoriesContentsService` -- service layer for history contents endpoints. Also defines `CreateHistoryContentPayload`, `CollectionElementIdentifier`, `HistoryContentsIndexParams`, `HistoryItemOperator` |
| `lib/galaxy/managers/collections.py` | `DatasetCollectionManager` -- central business logic for collection CRUD, matching, rule application |
| `lib/galaxy/managers/hdcas.py` | `HDCAManager`, `DCESerializer`, `DCSerializer`, `DCASerializer`, `HDCASerializer` -- CRUD manager and serialization |
| `lib/galaxy/managers/collections_util.py` | `api_payload_to_create_params()`, `validate_input_element_identifiers()`, `dictify_dataset_collection_instance()`, `dictify_element()`, `dictify_element_reference()`, `gen_rank_fuzzy_counts()` |
| `lib/galaxy/schema/schema.py` | Pydantic models: `CreateNewCollectionPayload`, `DCSummary`, `DCDetailed`, `DCESummary`, `DCObject`, `HDAObject`, `HDCASummary`, `HDCADetailed`, `HDCJobStateSummary`, `DatasetCollectionPopulatedState`, `DCEType`, `CollectionSourceType`, `DatasetCollectionInstanceType` |
| `lib/galaxy_test/api/test_dataset_collections.py` | API integration tests for collection creation, download, contents navigation, security, converters, sample sheets, workbooks |
