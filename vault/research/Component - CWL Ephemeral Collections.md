---
type: research
subtype: component
component: "workflow/ephemeral_collections"
tags:
  - research/component
  - galaxy/collections
  - galaxy/workflows
status: draft
created: 2026-02-23
revised: 2026-02-23
revision: 1
ai_generated: true
github_repo: galaxyproject/galaxy
related_notes:
  - "[[Component - Collection Adapters]]"
---

# CWL Ephemeral Collections in Galaxy

How Galaxy uses lightweight, non-persisted collections to dynamically group
datasets during workflow execution — primarily for CWL's
`MultipleInputFeatureRequirement`.

---

## What Is an EphemeralCollection?

A thin wrapper around an in-memory `DatasetCollection` that acts like an HDCA
but isn't initially persisted to the database. Defined in
`lib/galaxy/workflow/modules.py:3072-3097`:

```python
class EphemeralCollection:
    """Interface for collecting datasets together in workflows and treating as collections.

    These aren't real collections in the database - just datasets groupped together
    in someway by workflows for passing data around as collections.
    """
    ephemeral = True
    history_content_type = "dataset_collection"
    name = "Dynamically generated collection"

    def __init__(self, collection, history):
        self.collection = collection
        self.history = history
        hdca = model.HistoryDatasetCollectionAssociation(
            collection=collection, history=history,
        )
        history.add_dataset_collection(hdca)
        self.persistent_object = hdca

    @property
    def elements(self):
        return self.collection.elements
```

Key properties:
- `ephemeral = True` — flag checked throughout the codebase via `getattr(obj, "ephemeral", False)`
- `persistent_object` — lazily-persisted HDCA created in `__init__` but not flushed to DB until needed
- No base class — standalone duck-typed interface
- No `hid` attribute — used by `CollectionsToMatch` to detect ephemeral status

---

## When Are They Created?

**Only during workflow execution**, in `WorkflowInvoker.replacement_for_input_connections()`
(`lib/galaxy/workflow/run.py:466-557`).

Trigger: a workflow step has **multiple connections** mapped to a single tool input parameter.
This corresponds to CWL's `MultipleInputFeatureRequirement` — where a step input
declares multiple `source` entries that should be merged before delivery.

The creation logic:

1. Multiple outputs connect to one step input
2. `merge_type` is read from the `WorkflowStepInput` (default, `merge_flattened`, or `merge_nested`)
3. A new `DatasetCollection` is built in-memory with `DatasetCollectionElement` entries
4. Wrapped in `EphemeralCollection` and returned as the replacement value

### Merge Strategies

| `merge_type` | Input Type | Resulting collection_type | Behavior |
|---|---|---|---|
| default | datasets | `list` | Promote individual datasets to a list |
| `merge_flattened` | lists | `list` | Flatten all list elements into one list |
| `merge_nested` | lists | `list:<input_type>` | Nest input lists as sub-collections |
| `merge_nested` | datasets | N/A | `NotImplementedError` |

---

## How Are They Consumed?

Every consumer checks `getattr(obj, "ephemeral", False)` and extracts
`obj.persistent_object` to get the real HDCA. Locations:

### Tool Actions (`lib/galaxy/tools/actions/__init__.py:1031-1032`)
```python
if getattr(dataset_collection, "ephemeral", False):
    dataset_collection = dataset_collection.persistent_object
job.add_input_dataset_collection(name, dataset_collection)
```
Unwrap before recording job input links.

### Parameter Serialization (`lib/galaxy/tools/parameters/basic.py:1932-1938`)
```python
if getattr(value, "ephemeral", False):
    value = value.persistent_object
    if value.id is None:
        app.model.context.add(value)
        app.model.context.flush()
```
Force DB persistence when serializing to JSON for tool state. Comment references
`wf_wc_scatter_multiple_flattened` as the motivating test.

### Collection Manager (`lib/galaxy/managers/collections.py:272-280, 444-446`)
Unwraps before recording implicit input collections and propagating tags.

### Workflow Invocation Output Recording (`lib/galaxy/model/__init__.py:10239-10241`)
```python
if getattr(output_object, "ephemeral", False):
    return  # Don't record ephemeral collections as workflow step outputs
```
Silently skips — ephemeral collections are intermediates, not step outputs.

### Collection Matching (`lib/galaxy/model/dataset_collections/matching.py:18-23`)
```python
self.uses_ephemeral_collections = self.uses_ephemeral_collections or not hasattr(hdca, "hid")
```
Tracks whether any collection in the match set is ephemeral. When true,
`implicit_inputs` returns `[]` to avoid recording ephemeral intermediates.

### Tool Execution (`lib/galaxy/tools/execute.py:467-473`)
Checks `collection_info.uses_ephemeral_collections` to decide whether to
generate `on_text` labels from collection HIDs (skips for ephemeral).

---

## NOT Used For Tool Execution Directly

EphemeralCollections are created exclusively in the workflow invoker. They are
**not** used when running a standalone CWL tool via the API — that path uses
different mechanisms (CollectionAdapters, direct HDCA creation, etc.).

They are consumed by tool execution code because the workflow invoker passes
them as tool inputs, but the creation is always workflow-driven.

---

## Relationship to CollectionAdapters

Galaxy has a separate but related concept: `CollectionAdapter`
(`lib/galaxy/model/dataset_collections/adapters.py:28-70`). Both serve as
pseudo-collection wrappers, but they differ:

| | EphemeralCollection | CollectionAdapter |
|---|---|---|
| **Purpose** | Merge multiple workflow outputs into one input | Promote/reshape data for tool parameter matching |
| **Created by** | `WorkflowInvoker` | Tool execution/evaluation code |
| **Backed by** | Real `DatasetCollection` + lazy HDCA | Adapts existing HDAs/DCEs without creating new collections |
| **Persisted** | Eventually (on demand) | Serialized as adapter model for recovery |
| **Examples** | Merge two step outputs into a list | Promote single HDA to `paired_or_unpaired` |

Adapter subclasses: `DCECollectionAdapter`, `PromoteCollectionElementToCollectionAdapter`,
`PromoteDatasetToCollection`, `PromoteDatasetsToCollection`.

---

## Relationship to CWL Record/Array Types

CWL record types are mapped to Galaxy's `"record"` collection type
(`lib/galaxy/tool_util/cwl/representation.py`). When CWL workflows pass record
or array outputs between steps, the merge/scatter logic in the workflow invoker
may create EphemeralCollections to group them.

However, the primary mechanism for CWL record handling at the tool level is
through `CwlRecordParameterModel` and direct collection creation — not
EphemeralCollections. The ephemeral path specifically handles the
**multi-source merging** aspect of CWL workflows.

---

## Conformance Tests That Exercise EphemeralCollections

EphemeralCollections are triggered by `MultipleInputFeatureRequirement` — CWL
workflows where a step input has multiple `source` entries. These are tagged
`multiple_input` in the conformance suites.

### Direct Multiple-Input Merge Tests (Primary)

These are the core tests — they have multiple data links to the same step input
and directly exercise the `EphemeralCollection` creation path:

| Version | ID | Doc | Merge Type |
|---|---|---|---|
| v1.0, v1.1 | `wf_wc_scatter_multiple_merge` | Scatter step, two data links, default merge | default |
| v1.0, v1.1 | `wf_wc_scatter_multiple_nested` | Scatter step, two data links, nested merge | `merge_nested` |
| v1.0, v1.1 | `wf_wc_scatter_multiple_flattened` | Scatter step, two data links, flattened merge | `merge_flattened` |
| v1.0, v1.1 | `wf_scatter_twopar_oneinput_flattenedmerge` | Two params, one input, flattened merge (list inputs) | `merge_flattened` |
| v1.0, v1.1 | `scatter_multi_input_embedded_subworkflow` | Multiple input scatter over embedded subworkflow | default |

### Multiple-Source Value Tests

These connect multiple sources and may use valueFrom expressions to combine:

| Version | ID | Doc |
|---|---|---|
| v1.0, v1.1 | `valuefrom_wf_step_multiple` | valueFrom on step with multiple sources |
| v1.0, v1.1 | `wf_multiplesources_multipletypes` | Step input with multiple sources, multiple types |
| v1.0, v1.1 | `wf_multiplesources_multipletypes_noexp` | Same but without ExpressionTool |

### Negative Test

| Version | ID | Doc |
|---|---|---|
| v1.0, v1.1 | `wf_wc_nomultiple` | No MultipleInputFeatureRequirement needed for single-item list source |

### CWL Workflow Files

The key workflow files that exercise this:
- `count-lines4-wf.cwl` — default merge (two sources → one input)
- `count-lines6-wf.cwl` — nested merge
- `count-lines7-wf.cwl` — flattened merge (explicitly referenced in Galaxy source code comments)
- `count-lines12-wf.cwl` — flattened merge with list inputs
- `count-lines14-wf.cwl` — scatter with embedded subworkflow
- `step-valuefrom2-wf.cwl` — valueFrom with multiple sources
- `sum-wf.cwl` — multiple sources with mixed types

### v1.2 Tests

v1.2 inherits all v1.1 `multiple_input` tests and adds additional scatter/merge
combinations. The same IDs appear with v1.2-specific extensions.

---

## Data Flow Summary

```
CWL Workflow: step has MultipleInputFeatureRequirement
  step_input.source: [step_a/output, step_b/output]
  step_input.linkMerge: merge_flattened | merge_nested | (default)
        │
        ▼
Galaxy Workflow Import (parser.py:671-674)
  Converts to WorkflowStepInput with merge_type
        │
        ▼
WorkflowInvoker.replacement_for_input_connections() (run.py:466-557)
  len(connections) > 1 → build DatasetCollection in-memory
  Apply merge strategy (flatten/nest/promote)
  Return EphemeralCollection(collection, history)
        │
        ▼
Tool receives EphemeralCollection as input
  Passes through parameter matching (matching.py)
  Serialized via DataCollectionToolParameter.to_json() (basic.py)
  HDCA persisted to DB on demand
        │
        ▼
Job recorded with persistent HDCA reference
  EphemeralCollection not recorded as step output (model/__init__.py)
  Implicit inputs skipped for ephemeral (matching.py)
```

---

## Unit Test Coverage

- `test/unit/tool_util/test_cwl.py:283` — `test_workflow_multiple_input_merge_flattened()`
  validates that `count-lines7-wf.cwl` parses with `merge_type == "merge_flattened"`
- The conformance tests listed above exercise the full runtime path when run
  against a live Galaxy server

---

## Summary

EphemeralCollections are a **workflow-only** mechanism for dynamically grouping
datasets when CWL's `MultipleInputFeatureRequirement` (or Galaxy's equivalent
multi-source step inputs) requires merging multiple step outputs into a single
collection input. They are not used for standalone tool execution. They wrap a
real `DatasetCollection` + lazy HDCA, are detected via the `ephemeral=True`
flag, and are unwrapped to persistent objects at every consumption point.
