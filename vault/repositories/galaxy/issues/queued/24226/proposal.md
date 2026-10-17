# Mapping `list:list:paired_or_unpaired` over a `list:paired_or_unpaired` input splits one level too deep on the server

When a collection whose type ends in an input's full `X:paired_or_unpaired` type is mapped over that input, the server's map-over type keeps one rank too many. The tool then runs once per inner `paired_or_unpaired` element instead of once per `list:paired_or_unpaired` subcollection.

```
input collection: list:list:paired_or_unpaired
├── sampleA (list:paired_or_unpaired)
│   ├── el1 (paired_or_unpaired: forward, reverse)
│   └── el2 (paired_or_unpaired: unpaired)
└── sampleB (list:paired_or_unpaired)
    ├── el1 …
    └── el2 …

tool input: collection_type="list:paired_or_unpaired"
```

| | Map-over type | Jobs | Each job gets |
| --- | --- | --- | --- |
| Expected (and what the workflow editor shows) | `list` | 2: `sampleA`, `sampleB` | a `list:paired_or_unpaired` ✅ |
| Server (`release_26.0` and `dev`) | `list:list` | 4: `sampleA/el1`, `sampleA/el2`, `sampleB/el1`, `sampleB/el2` | a single `paired_or_unpaired` ❌ |

The server row comes from `get_structure(hdca, CTD("list:list:paired_or_unpaired"), leaf_subcollection_type="list:paired_or_unpaired")`. That is the call `matching.py` makes to lay out map-over jobs. The server builds exactly the same 4-job tree it builds for a plain `paired_or_unpaired` input. The repro below is a unit-level one; the full job run wasn't exercised. The editor computes `list` for the same connection, so a workflow saved in the editor would run at a different shape than the editor showed.

Pairs with the wrong type:

| Mapped collection | Input | Server | Expected |
| --- | --- | --- | --- |
| `list:list:paired_or_unpaired` | `list:paired_or_unpaired` | `list:list` | `list` |
| `list:list:list:paired_or_unpaired` | `list:paired_or_unpaired` | `list:list:list` | `list:list` |
| `list:list:list:paired_or_unpaired` | `list:list:paired_or_unpaired` | `list:list` | `list` |
| `list:paired:paired_or_unpaired` | `paired:paired_or_unpaired` | `list:paired` | `list` |

Rule: the mapped collection's type ends in `:` + the whole input type, and the input type ends in `:paired_or_unpaired`. Enumerating every collection type up to rank 4 finds 63 such pairs on `dev`, all wrong the same way. Most are combinations nobody builds. The first two rows are the realistic ones. Compound inputs whose suffix lines up with `:paired` or `:list` (for example `list:list:paired` over `list:paired_or_unpaired` → `list`) are already correct.

<details><summary>Unit-level reproduction</summary>

Drop into `test/unit/data/dataset_collections/` (reuses the `test_matching.py` builders):

```python
from galaxy.model.dataset_collections.structure import get_structure
from galaxy.model.dataset_collections.type_description import CollectionTypeDescriptionFactory
from .test_matching import collection_element, list_instance, list_of_paired_and_unpaired_instance

factory = CollectionTypeDescriptionFactory(None)


def leaves(tree, prefix=()):
    for ident, child in tree.children:
        if child.is_leaf:
            yield "/".join(prefix + (ident,))
        else:
            yield from leaves(child, prefix + (ident,))


def test_list_list_paired_or_unpaired_over_list_paired_or_unpaired():
    hdca = list_instance(
        collection_type="list:list:paired_or_unpaired",
        elements=[
            collection_element("sampleA", list_of_paired_and_unpaired_instance().collection),
            collection_element("sampleB", list_of_paired_and_unpaired_instance().collection),
        ],
    )
    tree = get_structure(
        hdca.collection,
        factory.for_collection_type("list:list:paired_or_unpaired"),
        "list:paired_or_unpaired",
    )
    assert tree.collection_type_description.collection_type == "list"  # actual: "list:list"
    assert list(leaves(tree)) == ["sampleA", "sampleB"]  # actual: sampleA/el1, sampleA/el2, sampleB/el1, sampleB/el2
```

Or directly:

```python
>>> factory.for_collection_type("list:list:paired_or_unpaired").effective_collection_type("list:paired_or_unpaired")
'list:list'
```

</details>

<details><summary>Where it goes wrong</summary>

`CollectionTypeDescription.effective_collection_type` (`lib/galaxy/model/dataset_collections/type_description.py`) sends every input type ending in `:paired_or_unpaired` through the compound peel-off branch. That branch runs *before* the plain suffix strip at the end of the method. The peel-off strips one rank from the mapped type for each `:` in the input type. It strips one more only when the mapped type ends in `:paired`. When the mapped type ends in `:paired_or_unpaired`, the input's own `paired_or_unpaired` rank is never stripped.

The predicate is right: `has_subcollections_of_type` / `can_map_over` already accept these pairs through their plain `endswith(f":{other}")` check. Only the effective type is wrong. The client's `CollectionTypeDescription.effectiveMapOver` enters its compound branch only when the mapped type ends in `:paired` or `:list`, so these pairs fall through to its plain suffix strip and come out right.

</details>

## Context

Bug found while working on 🌿 [`issue_24218_can_map_over_parity_26.0`](https://github.com/jmchilton/galaxy/tree/issue_24218_can_map_over_parity_26.0), the fix for 🎯 #24218. That issue covers the client/server mismatch in *whether* a collection can map over a `:paired_or_unpaired` input. This issue is the server half of *what type* the map-over leaves. The compound peel-off arrived in 🔀 #22193 (the 26.0 backport of 🔀 #22170). 🔀 #22565 later reworked these verbs on `dev` but left this branch of `effective_collection_type` unchanged.

## Proposed Approach

Make `effective_collection_type` check for a direct suffix match (`normalized.endswith(f":{normalized_sub}")`) before the compound peel-off, and strip the input's rank count in that case. That's the order the predicate already uses, and it gives the same results as the client. Stripping by rank rather than string length also stops the server truncating `sample_sheet` inputs on `release_26.0` (`list:list` over `sample_sheet` gives `""` today); the client keeps that truncation, and 🔀 #22565 makes those pairs unreachable on `dev`. Pin the expected types for the rows above in `test/unit/data/dataset_collections/test_type_descriptions.py`, and add the `get_structure` case above to `test_structure.py`. Mirror the same rows in the client's `collectionTypeDescription.test.ts` so the two sides can't drift apart again. Target `release_26.0`, where the compound support first shipped.

## Alternative Approaches

We could patch the peel-off loop to strip one more rank when the mapped type ends in `:paired_or_unpaired`, or rewrite all of `effective_collection_type` as rank-based stripping. The direct-suffix check is the smallest change. It mirrors both the predicate and the client, and it leaves the peel-off to the cases it handles correctly.

<details><summary>Alternatives In Detail</summary>

### Alternative: extend the peel-off loop

<details><summary>Description</summary>

#### Details

After the loop, also strip a rank when `normalized` ends in `:paired_or_unpaired`, next to the existing `:paired` case.

#### Why the proposed approach is preferred

It adds another suffix special case to a branch that already reasons per suffix. The direct-suffix check fixes every row with one rule that both the predicate and the client already use.

</details>

### Alternative: rank-based rewrite of the whole method

<details><summary>Description</summary>

#### Details

Compute the effective type by counting ranks consumed (input rank, plus one when `paired_or_unpaired` absorbs a `:paired`). Do this for every branch, shared with the client through a common parity table.

#### Why the proposed approach is preferred

It's cleaner in the long run, but it's a refactor on a release branch. It fits better as a `dev` follow-up once pinned tests cover these rows.

</details>

</details>
