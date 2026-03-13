# Lessons Learned: EphemeralCollection → CollectionAdapter Swap (Attempt 1)

**Commit:** `2eeef24cfe` on `cwl_fixes_6` — WIP state saved for reference.

## What Was Done

Implemented Steps 1-7 of `CWL_REPLACE_EPHEMERAL_COLLECTIONS_PLAN.md`:

1. **New adapter classes** — `MergeDatasetsAdapter` (Path A), `MergeListsFlattenedAdapter` (Path B), `MergeListsNestedAdapter` (Path C) + `TransientCollectionAdapterCollectionElement` helper in `adapters.py`.
2. **Pydantic models** — Internal + external serialization models in `parameters.py`, added to discriminated unions.
3. **Recovery** — Updated `recover_adapter()` + `src_id_to_item()` for list-of-HDA and list-of-HDCA adapting.
4. **Job recording** — Extended `actions/__init__.py` list-adapting branch for HDCA elements.
5. **Creation site** — Replaced `EphemeralCollection` creation in `replacement_for_input_connections()` with adapter returns.
5b. **CWL consumption** — Materialized adapters in `build_cwl_input_dict()` (CWL scatter needs real HDCA IDs), replaced scatter subcollection wrapping with direct HDCA creation.
6. **Consumption cleanup** — Removed all `getattr(x, "ephemeral", False)` checks, renamed `uses_ephemeral_collections` → `uses_non_persisted_collections`.
7. **Deleted EphemeralCollection class.**

## What Passed

- `wf_wc_scatter_multiple_merge` (Path A: datasets → list) ✅
- `wf_wc_scatter_multiple_flattened` (Path B: flatten lists) ✅
- `wf_wc_scatter_multiple_nested` (Path C: nest lists as list:list) ✅
- `wf_scatter_twopar_oneinput_flattenedmerge` ✅
- `scatter_wf1`, `scatter_wf2` ✅
- `valuefrom_wf_step_multiple` ✅

## What Failed

### Blocker 1: `on_text` / HID assumptions

**Where:** `tools/execute.py:462` and `tools/actions/__init__.py:989`

Two separate code paths compute `on_text` (the human-readable description of which collections a job ran on). Both assume collections have `hid`:

```python
# execute.py:462
assert item.hid is not None
collection_hids.append(item.hid)

# actions/__init__.py:989
assert dataset_collection.hid
collection_hids.append(dataset_collection.hid)
```

**Why it happens:** The CWL path materializes adapters to HDCAs via `_persist_adapter_as_hdca()` (needed for scatter ID lookup). These HDCAs have `hid=None` because they're not added to history via `history.add_dataset_collection()`. The `uses_non_persisted_collections` guard catches this for `execute.py` (via the matching code), but `actions/__init__.py:_get_on_text()` has its own independent HID check with no guard.

**Partial fix applied:** Changed `actions/__init__.py` assert to `if dataset_collection.hid:` (skip gracefully). Changed `matching.py` detection to `not getattr(hdca, "hid", None)` to catch None values. The `execute.py` path was guarded by `uses_non_persisted_collections`.

**Insight:** `on_text` doesn't need real HIDs. It could generate a reasonable string from adapters (e.g. "merged from 3 datasets") without persisting anything.

### Blocker 2: Subworkflow collection interface assumptions

**Where:** `workflow/modules.py:876` (SubWorkflowModule.get_collections_to_match)

```python
data = progress.replacement_for_input(self.trans, step, input_dict)
can_map_over = hasattr(data, "collection") and data.collection.allow_implicit_mapping
```

For `scatter_multi_input_embedded_subworkflow`, `replacement_for_input()` returns a `MergeDatasetsAdapter`. The adapter has `collection` (returns self), but not `allow_implicit_mapping`, `column_definitions`, and likely other attributes the subworkflow matching pipeline expects.

**Root cause:** The subworkflow mapping/slicing pipeline (`MatchingCollections.slice_collections()`, `walk_collections()`) deeply duck-types on HDCA/DatasetCollection interfaces. The adapter quacks like a collection at a high level but doesn't implement the full interface.

**Attempted fix:** Added `allow_implicit_mapping = True` to `CollectionAdapter` base. Next missing attribute was `column_definitions`. This is the whack-a-mole pattern — each fix exposes the next missing attribute.

**Fundamental tension:** Adapters are designed as lightweight wrappers for tool parameter serialization. The subworkflow path treats them as real collections for iteration/slicing. These are conflicting design goals.

### Blocker 3: The CWL materialization dilemma

The CWL scatter path (`find_cwl_scatter_collections`) loads collections from DB via `trans.sa_session.get(HDCA, ref["id"])`. This is a hard constraint — adapters MUST be materialized to real HDCAs with DB IDs before scatter detection. Similarly, subworkflow invocation needs real collections.

This means adapters are materialized in at least 3 places:
- `build_cwl_input_dict()` — CWL tool scatter
- `SubWorkflowModule.get_collections_to_match()` — subworkflow mapping
- `subworkflow_progress()` — multi-connection subworkflow inputs

If most consumers need materialization, the adapter approach only saves persistence for the happy path (non-CWL, non-subworkflow, non-scattered tool execution).

## Key Insights

### 1. "Collection-ness" is deeply embedded
Galaxy's collection infrastructure assumes model objects everywhere. Properties like `hid`, `allow_implicit_mapping`, `column_definitions`, `populated`, `dataset_action_tuples`, etc. are accessed across many code paths. Making adapters fully duck-type as collections is a significant interface contract.

### 2. Two distinct consumer patterns
- **Tool parameter pipeline** (basic.py `to_json()` / `from_json()`, actions recording): This is where adapters shine. They serialize cleanly, get recorded with adapter JSON, and recover properly.
- **Collection iteration pipeline** (matching, slicing, subworkflow mapping, scatter): This needs real collections. Adapters are fish out of water here.

### 3. The on_text problem is solvable independently
`on_text` generation (`_get_on_text` in actions, `on_text` property in execute.py) doesn't fundamentally need HIDs. It could:
- Skip collections without HIDs
- Generate descriptive text from adapters ("merged from N inputs")
- Use a fallback string

This should be fixed regardless of the EphemeralCollection replacement strategy.

### 4. EphemeralCollection's hidden superpower
EphemeralCollection creates a real HDCA immediately (`__init__` calls `model.HistoryDatasetCollectionAssociation()`). It doesn't add to history (no hid), but it has a real DB-persistable object ready. This means it can flow through the collection iteration pipeline because `persistent_object` IS a real HDCA. The `ephemeral` flag just controls whether consumers persist it or skip it.

The adapter approach tries to defer creation entirely, which conflicts with consumers that need real objects.

### 5. Subworkflow path is the hardest consumer
The subworkflow invocation path uses the merged collection for:
- Collection type matching (`get_collections_to_match`)
- Implicit mapping detection (`allow_implicit_mapping`)
- Collection slicing and iteration
- Passing as subworkflow inputs

All of these expect HDCA-like objects. An adapter-only approach would need to implement the full HDCA interface, which approaches "just use a real HDCA."

## Files Modified (in WIP commit)

| File | Key Changes |
|------|------------|
| `adapters.py` | +3 merge adapter classes, +1 collection element helper, +`allow_implicit_mapping`/`populated` on base |
| `parameters.py` | +6 Pydantic models (3 internal + 3 external), updated discriminated unions |
| `run.py` | Replaced EphemeralCollection creation with adapter returns, added `_persist_adapter_as_hdca` helper, adapter materialization in subworkflow path |
| `modules.py` | Deleted EphemeralCollection class, adapter materialization in `build_cwl_input_dict()` and SubWorkflowModule, direct HDCA for scatter subcollection wrapping |
| `actions/__init__.py` | Removed ephemeral check, extended adapter list recording for HDCAs, relaxed hid assert |
| `basic.py` | Removed ephemeral check in `to_json()`, extended `src_id_to_item()` for merge adapter recovery |
| `collections.py` | Replaced ephemeral checks with `isinstance(CollectionAdapter)` |
| `model/__init__.py` | Replaced ephemeral check with `isinstance(CollectionAdapter)` in `add_output()` |
| `matching.py` | Renamed flag, changed detection to `not getattr(hdca, "hid", None)` |
| `execute.py` | Renamed flag reference |

## Unresolved Questions for Next Attempt

- Should we make adapters fully implement the DatasetCollection interface (big surface area) or take a hybrid approach (adapter for tool params, early-materialized HDCA for iteration)?
- Can the subworkflow mapping code be refactored to work with a simpler "collection-like" interface rather than assuming full HDCA?
- Is there a middle ground: keep `_persist_adapter_as_hdca` but only for iteration-heavy paths (subworkflow, scatter), while letting adapters flow through the tool parameter pipeline?
- Should `on_text` and `_get_on_text` be refactored to handle adapter-shaped inputs natively? (This seems yes regardless.)
- The plan's Step 4 (job recording) worked well — adapters serialize/recover cleanly. Is it worth keeping just the serialization win even if we can't eliminate all materialization?
