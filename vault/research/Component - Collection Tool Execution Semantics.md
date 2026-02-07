---
type: research
subtype: component
tags:
  - research/component
  - galaxy/collections
  - galaxy/tools/collections
  - galaxy/tools
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
component: dataset_collections
galaxy_areas:
  - collections
  - tools
branch: structured_tool_state
---

# Collection Tool Execution Semantics in Galaxy

A Technical White Paper for Galaxy Developers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Collection Type Hierarchy](#2-collection-type-hierarchy)
3. [Input Mapping Semantics](#3-input-mapping-semantics)
4. [The Consume Value Model](#4-the-consume-value-model)
5. [Output Collection Creation](#5-output-collection-creation)
6. [Runtime Representation](#6-runtime-representation)
7. [Practical Examples](#7-practical-examples)
8. [Code References](#8-code-references)

---

## 1. Introduction

### What Are Dataset Collections?

Dataset collections are Galaxy's mechanism for grouping related datasets into structured containers that can be processed together. They enable:

- **Batch processing**: Apply a tool to multiple datasets simultaneously
- **Parallelization**: Galaxy automatically creates separate jobs for each element
- **Structure preservation**: Output collections maintain the same structure as inputs
- **Workflow composability**: Collections enable complex data flows without explicit loops

### Why Collections Matter for Tool Execution

When a tool accepts a single dataset input but receives a collection:

1. Galaxy "maps over" the collection, creating one job per element
2. Outputs are gathered into an "implicit collection" matching the input structure
3. Element identifiers flow through, enabling downstream matching

This happens transparently - tool authors need not be aware of collections for basic mapping scenarios.

### Core Principle

Galaxy's collection semantics follow a design principle: **"what should just intuitively work."** Users connect steps and Galaxy determines the natural execution pattern. This document formalizes that intuition for implementers.

---

## 2. Collection Type Hierarchy

### Fundamental Collection Types

Galaxy supports several base collection types, which can be nested:

| Type | Description | Element Identifiers |
|------|-------------|---------------------|
| `list` | Ordered sequence of datasets | User-defined (e.g., `sample1`, `sample2`) |
| `paired` | Forward/reverse read pairs | Fixed: `forward`, `reverse` |
| `paired_or_unpaired` | Single or paired reads | `unpaired` OR `forward`/`reverse` |
| `record` | Heterogeneous named fields | Schema-defined field names |
| `sample_sheet` | Tabular metadata with datasets | Row identifiers with column metadata |

### Nested Collection Types

Collection types compose via the `:` separator:

- `list:paired` - A list of paired datasets (e.g., multiple samples, each with forward/reverse)
- `list:list` - Nested lists (e.g., samples grouped by condition)
- `list:paired_or_unpaired` - List where each element may be single or paired

### Type Validation Regex

Collection types must match this pattern (from `type_description.py:15-17`):

```python
COLLECTION_TYPE_REGEX = re.compile(
    r"^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*|sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$"
)
```

### Collection Type Description

The `CollectionTypeDescription` class (`lib/galaxy/model/dataset_collections/type_description.py:31-175`) provides methods for working with collection types:

```python
class CollectionTypeDescription:
    def child_collection_type(self):
        """Returns the collection type after removing the outermost rank."""
        # e.g., "list:paired" -> "paired"

    def effective_collection_type(self, subcollection_type):
        """Returns the type after consuming a subcollection type."""
        # e.g., "list:list:paired".effective_collection_type("paired") -> "list:list"

    def has_subcollections_of_type(self, other_collection_type):
        """Check if this type contains subcollections of another type."""

    def rank_collection_type(self):
        """Returns the outermost collection type."""
        # e.g., "list:paired" -> "list"
```

### Dimension

The dimension of a collection type equals the number of `:` separators plus 2:

```python
@property
def dimension(self):
    return len(self.collection_type.split(":")) + 1
```

- `list` has dimension 2
- `list:paired` has dimension 3
- `list:list:paired` has dimension 4

---

## 3. Input Mapping Semantics

### Single Collection Input Iteration (Map Over)

When a tool declares a simple dataset parameter (`type="data"`) but receives a collection, Galaxy maps over the collection:

**Example**: Tool `(i: dataset) => {o: dataset}` with input `list[d1, d2, d3]`

Result: `list[tool(i=d1)[o], tool(i=d2)[o], tool(i=d3)[o]]`

The output collection preserves:
- The same collection type (`list`)
- The same element identifiers
- The same order

This extends naturally to nested collections:

**Example**: Tool `(i: dataset) => {o: dataset}` with input `list:paired[{forward=f, reverse=r}]`

Result: `list:paired[{forward=tool(i=f)[o], reverse=tool(i=r)[o]}]`

### Multiple Collection Inputs

When a tool has multiple dataset inputs, Galaxy supports two modes:

#### Linked (Matched) Semantics (Default)

Collections are iterated in lockstep - element N of input A is paired with element N of input B:

```python
# From meta.py:217
is_linked = value.get("linked", True)  # Default is linked=True
```

**Example**: Tool `(i1: dataset, i2: dataset) => {o: dataset}`
- Input 1: `list[a1, a2, a3]`
- Input 2: `list[b1, b2, b3]`

Result: `list[tool(i1=a1, i2=b1)[o], tool(i1=a2, i2=b2)[o], tool(i1=a3, i2=b3)[o]]`

**Requirement**: Linked collections must have identical structure (same element identifiers in same order).

#### Cross-Product (Unlinked) Semantics

When `linked=False`, Galaxy computes the Cartesian product:

```python
# From meta.py:220-221
elif is_batch:
    classification = input_classification.MULTIPLIED
```

**Example**: Tool `(i1: dataset, i2: dataset) => {o: dataset}`
- Input 1: `list[a1, a2]` (with `linked=False`)
- Input 2: `list[b1, b2]`

Result: Every combination is executed:
- `tool(i1=a1, i2=b1)`
- `tool(i1=a1, i2=b2)`
- `tool(i1=a2, i2=b1)`
- `tool(i1=a2, i2=b2)`

Galaxy provides built-in tools (`__CROSS_PRODUCT_FLAT__`, `__CROSS_PRODUCT_NESTED__`) to pre-compute cross-product structures for downstream linked mapping.

### Element Identifier Matching

For linked collections, matching occurs by structure position, not by identifier name. The matching algorithm (`lib/galaxy/model/dataset_collections/matching.py:40-120`):

```python
class MatchingCollections:
    def __attempt_add_to_linked_match(self, input_name, hdca, collection_type_description, subcollection_type):
        structure = get_structure(hdca, collection_type_description, leaf_subcollection_type=subcollection_type)
        if not self.linked_structure:
            self.linked_structure = structure
        else:
            if not self.linked_structure.can_match(structure):
                raise exceptions.MessageException(CANNOT_MATCH_ERROR_MESSAGE)
```

The `can_match` method (`lib/galaxy/model/dataset_collections/structure.py:130-145`) verifies:
1. Collection types are compatible
2. Same number of children at each level
3. Nested structure matches recursively

### Subcollection Mapping

A nested collection can be mapped over a tool that accepts a subcollection type:

**Example**: Tool `(i: collection<paired>) => {o: dataset}` with `list:paired` input

The tool receives each paired subcollection, producing a flat list output:

```
list:paired[{el1: {forward=f1, reverse=r1}}, {el2: {forward=f2, reverse=r2}}]
    => list[tool(i={forward=f1, reverse=r1})[o], tool(i={forward=f2, reverse=r2})[o]]
```

The mapping logic (`lib/galaxy/model/dataset_collections/subcollections.py:36-58`):

```python
def _split_dataset_collection(dataset_collection, collection_type):
    for element in dataset_collection.elements:
        if child_collection.collection_type == collection_type:
            split_elements.append(element)
        else:
            split_elements.extend(_split_dataset_collection(child_collection, collection_type))
```

---

## 4. The Consume Value Model

### Conceptual Framework

Tool inputs "consume" collection structure based on their declared type:

| Input Declaration | What It Consumes | Remaining Structure |
|-------------------|------------------|---------------------|
| `type="data"` | Single dataset | Maps over entire collection |
| `type="data" multiple="true"` | List (reduces it) | Outer collection type |
| `type="data_collection" collection_type="paired"` | Paired subcollection | Outer list(s) |
| `type="data_collection" collection_type="list"` | List subcollection | Outer collection type |

### Reduction vs Mapping

**Reduction** occurs when an input consumes an entire collection rank:

- `multiple="true"` data inputs reduce `list` to nothing (or outer list for nested)
- `collection_type="list"` inputs reduce `list` to nothing

**Mapping** occurs when collection structure remains after consumption:

- `list:paired` over `paired` input => maps, produces `list`
- `list:list` over `list` input => maps, produces `list`

### What Cannot Be Reduced

Paired collections cannot be reduced by `multiple="true"` inputs:

```python
# From collection_semantics.md documentation
# PAIRED_REDUCTION_INVALID - paired cannot be reduced by multiple data input
```

This is intentional: `paired` represents a semantic tuple (forward/reverse), not an arbitrary list.

### paired_or_unpaired Special Handling

The `paired_or_unpaired` type has special consumption rules:

1. It can consume `paired` collections (forward/reverse case)
2. It can consume single datasets via `single_datasets` subcollection mapping
3. `paired` inputs CANNOT consume `paired_or_unpaired` (may lack forward/reverse)

From `type_description.py:92-98`:
```python
if other_collection_type == "paired_or_unpaired":
    # this can be thought of as a subcollection of anything except a pair
    return collection_type != "paired"
if other_collection_type == "single_datasets":
    # effectively any collection has unpaired subcollections
    return True
```

---

## 5. Output Collection Creation

### Structure Inheritance

Output collections inherit structure from input collections being mapped over. The structure determination (`lib/galaxy/model/dataset_collections/structure.py:180-211`):

```python
def tool_output_to_structure(get_sliced_input_collection_structure, tool_output, collections_manager):
    if not tool_output.collection:
        tree = leaf
    else:
        structured_like = tool_output.structure.structured_like
        collection_type = tool_output.structure.collection_type
        if structured_like:
            tree = get_sliced_input_collection_structure(structured_like)
```

### Implicit Collection Creation

When mapping over collections, Galaxy pre-creates output collections (`lib/galaxy/tools/execute.py:583-638`):

```python
def precreate_output_collections(self, history, params, tool_request):
    for output_name, output in self.tool.outputs.items():
        effective_structure = self._mapped_output_structure(trans, output)
        collection_instance = trans.app.dataset_collection_manager.precreate_dataset_collection_instance(
            trans=trans,
            parent=history,
            name=output_collection_name,
            structure=effective_structure,
            implicit_inputs=implicit_inputs,
        )
```

The `effective_structure` is computed by multiplying the mapping structure by the output structure:

```python
def _mapped_output_structure(self, trans, tool_output):
    output_structure = tool_output_to_structure(...)
    mapping_structure = self._structure_for_output(trans, tool_output)
    return mapping_structure.multiply(output_structure)
```

### Structure Multiplication

When a tool that produces collections is mapped over a collection, structures multiply (`lib/galaxy/model/dataset_collections/structure.py:150-165`):

```python
def multiply(self, other_structure):
    if other_structure.is_leaf:
        return self.clone()

    new_collection_type = self.collection_type_description.multiply(other_structure.collection_type_description)
    new_children = []
    for identifier, structure in self.children:
        new_children.append((identifier, structure.multiply(other_structure)))
    return Tree(new_children, new_collection_type)
```

**Example**: Mapping `list[a, b]` over a tool that outputs `paired`:
- Structure: `list` x `paired` = `list:paired`
- Result: `list:paired[{a: {forward, reverse}}, {b: {forward, reverse}}]`

### Element Identifier Propagation

Output collection elements inherit identifiers from input collections. The `default_identifier_source` output attribute can specify which input provides identifiers when multiple collections are involved.

---

## 6. Runtime Representation

### Wrapper Classes

At tool execution time, collection data is wrapped for template access (`lib/galaxy/tools/wrappers.py`):

#### DatasetFilenameWrapper (lines 288-540)

Wraps individual datasets within collections:

```python
class DatasetFilenameWrapper(ToolParameterValueWrapper):
    @property
    def element_identifier(self) -> str:
        identifier = self._element_identifier
        if identifier is None:
            identifier = self.name
        return identifier
```

Key properties:
- `__str__()` returns the file path
- `element_identifier` returns the dataset's identifier within its collection
- `file_ext` returns the file extension

#### DatasetCollectionWrapper (lines 639-800)

Wraps collection parameters:

```python
class DatasetCollectionWrapper(ToolParameterValueWrapper, HasDatasets):
    def __init__(self, job_working_directory, has_collection, ...):
        for dataset_collection_element in elements:
            element_identifier = dataset_collection_element.element_identifier
            if isinstance(element_object, DatasetCollection):
                element_wrapper = DatasetCollectionWrapper(...)  # Recursive
            else:
                element_wrapper = self._dataset_wrapper(element_object, identifier=element_identifier)
```

### Accessing Collection Elements

In Cheetah templates:

```cheetah
## Iterate over collection elements
#for $element in $input_collection
    $element              ## File path
    $element.element_identifier  ## Element name
    $element.ext          ## File extension
#end for

## Access by identifier
$input_collection['forward']
$input_collection['reverse']

## Get all paths
#for $path in $input_collection.all_paths
    $path
#end for
```

### Element Identifier Flow

When mapping over collections, each job receives the element identifier via a special parameter:

```python
# From actions/__init__.py:501-503
identifier = getattr(data, "element_identifier", None)
if identifier is not None:
    incoming[f"{name}|__identifier__"] = identifier
```

This enables tools to access the identifier of the dataset they're processing.

---

## 7. Practical Examples

### Example 1: Simple List Mapping

**Tool**: `cat_file.xml` - concatenates file contents
**Input**: `list[file1.txt, file2.txt, file3.txt]`

Galaxy creates 3 jobs:
1. `cat_file(input=file1.txt)` -> `out1.txt`
2. `cat_file(input=file2.txt)` -> `out2.txt`
3. `cat_file(input=file3.txt)` -> `out3.txt`

**Output**: `list[out1.txt, out2.txt, out3.txt]` with same identifiers

### Example 2: Paired Collection Processing

**Tool**: `bwa_mem.xml` - accepts `collection_type="paired"`
**Input**: `list:paired` with 2 samples

Galaxy creates 2 jobs (one per paired element):
1. `bwa_mem(reads={forward=s1_R1.fq, reverse=s1_R2.fq})`
2. `bwa_mem(reads={forward=s2_R1.fq, reverse=s2_R2.fq})`

**Output**: `list[aligned_s1.bam, aligned_s2.bam]`

### Example 3: Multiple Linked Collections

**Tool**: `compare.xml` - compares two files
**Input A**: `list[a1, a2, a3]`
**Input B**: `list[b1, b2, b3]`

With default linked semantics:
1. `compare(file1=a1, file2=b1)`
2. `compare(file1=a2, file2=b2)`
3. `compare(file1=a3, file2=b3)`

**Output**: `list[cmp1, cmp2, cmp3]`

### Example 4: Reduction with Multiple Input

**Tool**: `merge.xml` - `type="data" multiple="true"`
**Input**: `list[f1, f2, f3]`

Single job consumes entire list:
- `merge(inputs=[f1, f2, f3])` -> single output dataset

### Example 5: Nested Collection Mapping

**Tool**: `single_file_tool.xml` - accepts single dataset
**Input**: `list:list[[a1, a2], [b1, b2, b3]]`

Galaxy creates 5 jobs:
1. `tool(input=a1)`
2. `tool(input=a2)`
3. `tool(input=b1)`
4. `tool(input=b2)`
5. `tool(input=b3)`

**Output**: `list:list[[out_a1, out_a2], [out_b1, out_b2, out_b3]]`

### Example 6: Cross-Product Execution

**Setup**: Use `__CROSS_PRODUCT_FLAT__` tool first
**Input A**: `list[a1, a2]`
**Input B**: `list[b1, b2]`

Cross-product tool outputs:
- `output_a`: `list[a1, a1, a2, a2]` with identifiers `[a1_b1, a1_b2, a2_b1, a2_b2]`
- `output_b`: `list[b1, b2, b1, b2]` with identifiers `[a1_b1, a1_b2, a2_b1, a2_b2]`

Downstream tool with linked mapping produces all 4 combinations.

---

## 8. Code References

### Core Model Classes

| Class | File | Lines | Purpose |
|-------|------|-------|---------|
| `DatasetCollection` | `lib/galaxy/model/__init__.py` | 6982-7090 | Collection storage model |
| `DatasetCollectionElement` | `lib/galaxy/model/__init__.py` | 8006-8100 | Element within collection |
| `DatasetCollectionInstance` | `lib/galaxy/model/__init__.py` | 7494-7544 | Base for HDCA/LDCA |
| `HistoryDatasetCollectionAssociation` | `lib/galaxy/model/__init__.py` | varies | History-bound collection |

### Collection Type System

| File | Key Components |
|------|----------------|
| `lib/galaxy/model/dataset_collections/type_description.py` | `CollectionTypeDescription`, type matching logic |
| `lib/galaxy/model/dataset_collections/types/__init__.py` | `BaseDatasetCollectionType` abstract base |
| `lib/galaxy/model/dataset_collections/types/list.py` | `ListDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/paired.py` | `PairedDatasetCollectionType` |
| `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py` | `PairedOrUnpairedDatasetCollectionType` |

### Matching and Structure

| File | Key Components |
|------|----------------|
| `lib/galaxy/model/dataset_collections/matching.py` | `CollectionsToMatch`, `MatchingCollections` |
| `lib/galaxy/model/dataset_collections/structure.py` | `Tree`, `Leaf`, `get_structure`, `tool_output_to_structure` |
| `lib/galaxy/model/dataset_collections/subcollections.py` | `split_dataset_collection_instance` |
| `lib/galaxy/model/dataset_collections/query.py` | `HistoryQuery`, collection type matching for parameters |

### Tool Parameter Handling

| File | Key Components |
|------|----------------|
| `lib/galaxy/tools/parameters/basic.py:2489-2700` | `DataCollectionToolParameter` |
| `lib/galaxy/tools/parameters/meta.py:189-260` | `expand_meta_parameters` - batch expansion |
| `lib/galaxy/tools/parameters/meta.py:345-391` | `expand_meta_parameters_async` - async expansion |
| `lib/galaxy/tools/parameters/meta.py:419-462` | `__expand_collection_parameter` |

### Execution Pipeline

| File | Key Components |
|------|----------------|
| `lib/galaxy/tools/execute.py:93-361` | `execute`, `ExecutionTracker` |
| `lib/galaxy/tools/execute.py:499-538` | `sliced_input_collection_structure` |
| `lib/galaxy/tools/execute.py:561-573` | `_mapped_output_structure` |
| `lib/galaxy/tools/execute.py:583-638` | `precreate_output_collections` |
| `lib/galaxy/tools/actions/__init__.py:134-795` | `DefaultToolAction.execute` |

### Collection Manager

| File | Key Components |
|------|----------------|
| `lib/galaxy/managers/collections.py:70-350` | `DatasetCollectionManager` |
| `lib/galaxy/managers/collections.py:96-178` | `precreate_dataset_collection_instance`, `precreate_dataset_collection` |

### Runtime Wrappers

| File | Key Components |
|------|----------------|
| `lib/galaxy/tools/wrappers.py:288-540` | `DatasetFilenameWrapper` |
| `lib/galaxy/tools/wrappers.py:552-634` | `DatasetListWrapper` |
| `lib/galaxy/tools/wrappers.py:639-800` | `DatasetCollectionWrapper` |

### Builder Pattern

| File | Key Components |
|------|----------------|
| `lib/galaxy/model/dataset_collections/builder.py:27-46` | `build_collection` |
| `lib/galaxy/model/dataset_collections/builder.py:95-199` | `CollectionBuilder` |
| `lib/galaxy/model/dataset_collections/builder.py:201-220` | `BoundCollectionBuilder` |

---

## Appendix: Key Algorithms

### Collection Matching Algorithm

```
function match_collections(collections_to_match):
    matching = MatchingCollections()
    for each (input_key, to_match) in collections_to_match:
        collection = to_match.hdca
        type_description = for_collection_type(collection.collection_type)
        subcollection_type = to_match.subcollection_type

        if to_match.linked:
            structure = get_structure(collection, type_description, subcollection_type)
            if not matching.linked_structure:
                matching.linked_structure = structure
            else if not matching.linked_structure.can_match(structure):
                raise "Cannot match collection types"
            matching.add(input_key, collection, subcollection_type)
        else:
            structure = get_structure(...)
            matching.unlinked_structures.append(structure)

    return matching
```

### Structure Walking for Execution

```
function walk_collections(self, hdca_dict):
    for each (index, (identifier, substructure)) in self.children:
        elements = {k: collection[index] for k, collection in hdca_dict}

        if substructure.is_leaf:
            yield elements  # These go to individual jobs
        else:
            for child_elements in substructure.walk_collections(child_collections):
                yield child_elements
```

### Output Structure Computation

```
function compute_output_structure(tool_output, collection_info):
    # Get the structure from tool output definition
    if tool_output.structured_like:
        output_structure = get_input_structure(tool_output.structured_like)
    else:
        output_structure = UninitializedTree(tool_output.collection_type)

    # Multiply by mapping structure
    mapping_structure = collection_info.structure
    return mapping_structure.multiply(output_structure)
```

---

## References

- Galaxy Collection Semantics Documentation: `doc/source/dev/collection_semantics.md`
- Planemo Documentation: https://planemo.readthedocs.io/
- Galaxy Tool Development: https://docs.galaxyproject.org/en/latest/dev/schema.html
