# Mapping a list-output tool over a sample sheet precreates an invalid collection type

Mapping a tool with a `list` collection output over a sample sheet precreates an implicit output of type `sample_sheet:list`, which Galaxy's own collection-type validator rejects.

| Mapping structure | Per-job output | Precomputed output type | Validator |
| --- | --- | --- | --- |
| `sample_sheet` | `list` | `sample_sheet:list` | ❌ Invalid |
| `sample_sheet` | `list:paired` | `sample_sheet:list:paired` | ❌ Invalid |
| `sample_sheet` | `paired` | `sample_sheet:paired` | ✅ Valid |

The mapping structure can come from mapping over individual datasets in a flat sample sheet, or over the `paired` subcollections of a `sample_sheet:paired`. The output should have a supported collection type. This report leaves open whether that means using an ordinary list for the outer level or supporting more nested sample sheet types.

<details>
<summary>Reproduce the invalid type in collection precomputation and precreation</summary>

This is an in-process reproduction of the structure and collection precreation code, not a submitted API job or a browser reproduction. Run from a Galaxy checkout with its Python environment installed:

```sh
PYTHONPATH=lib .venv/bin/python - <<'PY'
from galaxy.managers.collections import DatasetCollectionManager
from galaxy.model.dataset_collections.structure import Tree, UninitializedTree, leaf
from galaxy.model.dataset_collections.type_description import CollectionTypeDescriptionFactory

factory = CollectionTypeDescriptionFactory()
# Precreation here needs no initialized application or database session.
manager = object.__new__(DatasetCollectionManager)
mapping = Tree(
    [("sample1", leaf)],
    factory.for_collection_type("sample_sheet"),
    columns_metadata={"sample1": ["treated"]},
    column_definitions=[{"name": "condition", "type": "string", "optional": False}],
)
for output_type in ("list", "list:paired", "paired"):
    output = UninitializedTree(factory.for_collection_type(output_type))
    result = mapping.multiply(output)
    collection = manager.precreate_dataset_collection(result)
    print(f"{output_type} -> {collection.collection_type}")
    assert collection.column_definitions == mapping.column_definitions
    assert collection.elements[0].columns == ["treated"]
    # Precreation succeeds; validate explicitly to expose the inconsistency.
    try:
        result.collection_type_description.validate()
        print("valid")
    except Exception as exc:
        print(type(exc).__name__, str(exc))
PY
```

Observed output:

```text
list -> sample_sheet:list
RequestParameterInvalidException Invalid collection type: [sample_sheet:list]
list:paired -> sample_sheet:list:paired
RequestParameterInvalidException Invalid collection type: [sample_sheet:list:paired]
paired -> sample_sheet:paired
valid
```

Executed at `1e6125acd93b22a682043509e9549b124546fd25`. The relevant multiplication, type validation and tree code is unchanged on upstream `dev` at `557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2`.

[`ExecutionTracker._mapped_output_structure`](https://github.com/galaxyproject/galaxy/blob/557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2/lib/galaxy/tools/execute.py) multiplies the mapping structure by the tool's output structure. [`Tree.multiply`](https://github.com/galaxyproject/galaxy/blob/557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2/lib/galaxy/model/dataset_collections/structure.py) delegates type composition to [`map_over_collection_type`](https://github.com/galaxyproject/galaxy/blob/557e7f327839dd3ec0adee0b0660e7ed0d3c7fe2/lib/galaxy/model/dataset_collections/type_description.py), which concatenates the two types. The same file's validator allows `sample_sheet` alone or followed by `paired`, `record` or `paired_or_unpaired`, but not `list`.

Precreation itself succeeds; the exceptions above come from the reproduction's explicit `validate()` call. The assertions also confirm that precreation preserves the outer sample's column definitions and row values. No particular job failure, downstream API failure or editor behavior is claimed here.

</details>

## Context

Discovered while working on 🎯 #24303 and 🌿 [the `type_prefix` branch](https://github.com/jmchilton/galaxy/tree/issue_24303_collection_type_prefix_26.2). This is a pre-existing composition problem for ordinary collection outputs; it does not require `type_prefix`. It is separate from 🎯 #24308 (resolving a `type_source` output's per-job type) and 🎯 #24226 (computing the mapping structure for nested `paired_or_unpaired` inputs).
