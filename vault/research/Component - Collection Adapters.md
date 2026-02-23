---
type: research
subtype: component
component: "dataset_collections/adapters"
tags:
  - research/component
  - galaxy/collections
  - galaxy/tools
status: draft
created: 2026-02-23
revised: 2026-02-23
revision: 1
ai_generated: true
github_repo: galaxyproject/galaxy
related_prs:
  - 19377
---

# Component: Collection Adapters

## Overview

Collection adapters are a framework for wrapping model objects (datasets, collection elements) into ephemeral, collection-like facades for tool execution. They exist only during tool evaluation — never persisted as real collections, never visible to users. They let Galaxy accept flexible input combinations (single datasets, pairs of datasets, collection elements) where a tool declares a collection input, bridging type gaps at runtime.

Introduced in PR #19377 ("Empower Users to Build More Kinds of Collections, More Intelligently"), implementing the design from issue #19359. Evolved from the earlier "EphemeralCollections" concept in the CWL branch.

**Key source file:** `lib/galaxy/model/dataset_collections/adapters.py`

## Motivation

Galaxy tool authors historically had to write complex conditionals to handle different data structures. A mapper tool shouldn't need separate code paths for paired reads, single-end reads, and mixed collections. The adapter framework pushes that complexity into Galaxy's runtime:

```xml
<!-- Before: tool authors wrote complex conditionals -->
<conditional name="single_paired">
    <param name="type" type="select">
        <option value="single">Single-end</option>
        <option value="paired">Paired-end</option>
        <option value="paired_collection">Paired Collection</option>
        <option value="paired_list">List of Pairs</option>
    </param>
    <!-- ... dozens of lines per option ... -->
</conditional>

<!-- After: one input, Galaxy handles the rest -->
<param type="data_collection" collection_type="paired_or_unpaired" label="Reads" />
```

When a user passes a single dataset to a `paired_or_unpaired` input, Galaxy wraps it in a `PromoteDatasetToCollection` adapter. When passing `paired` to `paired_or_unpaired`, an adapter bridges the type gap. The tool code never knows the difference.

## Architecture

### Base Class: `CollectionAdapter`

`adapters.py:28-70` — Abstract base defining the interface that all adapters must implement. Mirrors the `DatasetCollection` interface used by tool execution code:

| Property | Purpose |
|----------|---------|
| `dataset_action_tuples` | Security permission tuples for RBAC checks |
| `dataset_states_and_extensions_summary` | Metadata summary (states, extensions, dbkeys) |
| `dataset_instances` | List of underlying `HistoryDatasetAssociation` objects |
| `elements` | Collection elements (real or transient) |
| `collection_type` | String type identifier (e.g., `"paired_or_unpaired"`, `"list"`) |
| `collection` | Returns `self` — adapter serves as both the association and collection object |
| `adapting` | The wrapped model object (for recording job provenance) |
| `to_adapter_model()` | Serialize to Pydantic model for database persistence |

### Concrete Adapters

**1. `PromoteCollectionElementToCollectionAdapter`** (`adapters.py:122-135`)
- Wraps a `DatasetCollectionElement` → acts as `paired_or_unpaired`
- Use case: mapping over `list:paired_or_unpaired` — each element (which may be a single dataset rather than a subcollection) gets promoted
- Created in `subcollections.py:44-45` when splitting flat collections via `single_datasets` pseudo-type
- Inherits from `DCECollectionAdapter` (shared logic for wrapping DCEs)

**2. `PromoteDatasetToCollection`** (`adapters.py:138-189`)
- Wraps a single `HistoryDatasetAssociation` → acts as `list` or `paired_or_unpaired`
- For `paired_or_unpaired`: element identifier becomes `"unpaired"`
- For `list`: element identifier is the dataset name
- Creates `TransientCollectionAdapterDatasetInstanceElement` to wrap the HDA

**3. `PromoteDatasetsToCollection`** (`adapters.py:192-262`)
- Wraps multiple HDAs → acts as `paired` or `paired_or_unpaired`
- Takes pre-built list of `TransientCollectionAdapterDatasetInstanceElement` objects
- Use case: user specifies forward + reverse datasets separately, adapter makes them look like a paired collection

### Helper: `TransientCollectionAdapterDatasetInstanceElement`

`adapters.py:265-285` — Lightweight stand-in for `DatasetCollectionElement`. Holds an HDA + element identifier without database backing. Implements `element_object`, `dataset_instance`, `is_collection`, `columns` to satisfy the DCE interface.

## Type Matching

`type_description.py:107-126` — `can_match_type()` determines when adapters are needed:

- `paired` matches `paired_or_unpaired` (asymmetric — not vice versa)
- `list:paired_or_unpaired` matches both `list` and `list:paired`
- Pattern: `X:paired_or_unpaired` matches `X` and `X:paired`

When `can_match_type()` returns true but types differ, the tool parameter code creates an appropriate adapter.

## Persistence & Recovery

Adapters are ephemeral but their **configuration is persisted** on job input association tables for provenance:

**DB columns** (migration `ec25b23b08e2`):
- `job_to_input_dataset.adapter` — JSON
- `job_to_input_dataset_collection.adapter` — JSON
- `job_to_input_dataset_collection_element.adapter` — JSON

**Pydantic models** (`tool_util_models/parameters.py`):

External API models (user-facing, reference by encoded ID):
- `AdaptedDataCollectionPromoteDatasetToCollectionRequest`
- `AdaptedDataCollectionPromoteDatasetsToCollectionRequest`
- Discriminated union: `AdaptedDataCollectionRequest` on `adapter_type`

Internal models (DB-facing, reference by raw int ID):
- `AdaptedDataCollectionPromoteCollectionElementToCollectionRequestInternal`
- `AdaptedDataCollectionPromoteDatasetToCollectionRequestInternal`
- `AdaptedDataCollectionPromoteDatasetsToCollectionRequestInternal`
- Discriminated union: `AdaptedDataCollectionRequestInternal` on `adapter_type`

**Recovery**: `recover_adapter()` (`adapters.py:288-297`) reconstitutes the adapter from a persisted model + the wrapped object loaded from DB. Called during job input recovery in `tools/parameters/basic.py`.

## Integration Points

### Tool Parameter Resolution (`tools/parameters/basic.py`)
`DataCollectionToolParameter.from_json()` accepts `CollectionAdapter` objects directly or dicts with `src: "CollectionAdapter"`. When receiving a dict, it validates against the adapter models, loads the referenced objects from the DB, and calls `recover_adapter()`.

### Tool Actions (`tools/actions/__init__.py`)
`_collect_input_datasets()` checks `isinstance(value, CollectionAdapter)` and handles adapters alongside real collections. Adapters flow through:
1. Security checks via `dataset_action_tuples`
2. State/extension summaries via `dataset_states_and_extensions_summary`
3. Dataset listing via `dataset_instances`
4. Job recording via `to_adapter_model()` → serialized to `adapter` JSON column

### Subcollection Splitting (`dataset_collections/subcollections.py`)
When mapping over collections, `_split_dataset_collection()` creates `PromoteCollectionElementToCollectionAdapter` for flat collection elements that need to look like subcollections (line 44-45). The `single_datasets` pseudo-type triggers this.

### Collection Builder (`dataset_collections/builder.py`)
`replace_elements_in_collection()` accepts `Union[CollectionAdapter, DatasetCollection]` as template, enabling format conversion on adapter-wrapped inputs.

## Proposed Future Adapters (from #19359)

Issue #19359 remains open. Several additional adapters are proposed but not yet implemented:

1. **PromoteDatasetsToListAdapter** — send a set of individual datasets to a `list` collection input. API: `{"src": "CollectionAdapter", "adapter_type": "PromoteDatasetsToList", "adapting": [{"src": "hda", "id": ...}, ...]}`

2. **WrapEachElementInAListAdapter** — map a `list` over a `list` input or multi-data input. Would wrap each element of an existing list collection in its own singleton list, enabling mapping over list-typed inputs.

3. **Broader `PromoteDatasetToCollection` scope** — currently limited to `list` and `paired_or_unpaired`. Could expand to support promoting a dataset into any flat collection type.

4. **Tool form enhancements** — adapters are most powerful when paired with UI that lets users select "single dataset" or "forward/reverse pair" on a tool form that declares `paired_or_unpaired`, with Galaxy auto-creating the adapter.

The overall direction: absorb collection complexity out of tools and into Galaxy's runtime + UI, so tools declare what they need and Galaxy figures out how to provide it.

## Relationship to Other Collection Work

- **`paired_or_unpaired` type** (`types/paired_or_unpaired.py`): The primary collection type driving adapter creation. Mixed paired/unpaired data in one collection.
- **`record` type** (`types/record.py`): Heterogeneous tuples with named fields. Foundation for sample sheets. Records are a generalization of paired (`paired` = record with fields `[{type: File, name: forward}, {type: File, name: reverse}]`).
- **List Wizard UI** (`Collections/ListWizard.vue`, `PairedOrUnpairedListCollectionCreator.vue`): Replaced the old `PairedListCollectionCreator`. Auto-detects pairing, builds `list:paired_or_unpaired` collections.
- **`__SPLIT_PAIRED_AND_UNPAIRED__` tool** (`tools/split_paired_and_unpaired.xml`): Splits `list:paired_or_unpaired` into homogeneous `list` + `list:paired`.
- **Collection semantics spec** (`types/collection_semantics.yml`): Formal spec of mapping, reduction, and type matching rules.

## Key Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/adapters.py` | Core adapter classes + recovery |
| `lib/galaxy/model/dataset_collections/subcollections.py` | Creates adapters during collection splitting |
| `lib/galaxy/model/dataset_collections/type_description.py` | `can_match_type()` — when adapters are needed |
| `lib/galaxy/tool_util_models/parameters.py` | Pydantic models for adapter serialization |
| `lib/galaxy/tools/parameters/basic.py` | Adapter resolution in tool parameter processing |
| `lib/galaxy/tools/actions/__init__.py` | Adapter handling in job recording |
| `lib/galaxy/model/dataset_collections/builder.py` | Adapter-aware collection building |
| `lib/galaxy/model/dataset_collections/registry.py` | Collection type plugin registration |
| `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py` | Primary type driving adapter use |

## Unresolved Questions

- Should `can_match_type()` logic move into the type registry/plugins rather than being hardcoded? (Comment in source: "can we push this to the type registry somehow?")
- How will adapter creation surface in the tool form UI? Currently adapters are created programmatically; richer UI could let users pick "single dataset" / "forward+reverse pair" on collection inputs.
- Will `WrapEachElementInAListAdapter` require changes to implicit mapping logic or just tool parameter resolution?
- How do adapters interact with workflow connections? Can the workflow editor infer adapter requirements from connected output types?
