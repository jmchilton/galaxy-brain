# Revised Plan: Replace EphemeralCollections with CollectionAdapter Merge Subclasses (V2)

## Executive Summary

Attempt 1 proved Steps 1-4 (adapter classes, Pydantic models, recovery, job recording) work. Failures were in the **collection iteration pipeline** — `on_text` HID assertions and SubWorkflowModule duck-typing on HDCA properties.

**Revised strategy — two-tier approach:**
1. Adapters flow through the tool parameter pipeline (serialization, recording, recovery) — already works.
2. Fix iteration pipeline to tolerate adapter-shaped objects; materialize only where DB IDs are required (CWL scatter, subworkflow invocation).

---

## Complete Inventory of "Collection-ness" Assumptions

### Category A: HID assumptions (fix consumer — don't need real HIDs)

| Site | File:Line | Current Code |
|------|-----------|-------------|
| A1 | `execute.py:462` | `assert item.hid is not None` — guarded by `uses_non_persisted_collections` |
| A2 | `actions/__init__.py:989` | `assert dataset_collection.hid` — **NOT guarded** |
| A3 | `matching.py:25` | `not getattr(hdca, "hid", None)` — sets guard flag |

**Fix**: A1 already guarded. A2: change assert to `if dataset_collection.hid:`. A3 already correct in WIP.

### Category B: `.collection` + `allow_implicit_mapping` (adapter implements)

| Site | File:Line | Property |
|------|-----------|----------|
| B1 | `modules.py:881` | `.collection.allow_implicit_mapping` |
| B2 | `matching.py:42` | `.collection` via `get_child_collection` |
| B3 | `matching.py:93` | `.collection` in `slice_collections_crossproduct` |
| B4 | `matching.py:118` | `.dataset_action_tuples` |
| B5 | `structure.py:233` | `.collection` in `get_structure` |
| B6 | `structure.py:104` | `.collection` in `walk_collections` |

Adapter already has `.collection` (returns self), `allow_implicit_mapping = True`, `dataset_action_tuples`. These work.

### Category C: Structure/walk interface (add 2 properties to adapter)

| Site | File:Line | Property | Fix |
|------|-----------|----------|-----|
| C1 | `structure.py:100` | `.column_definitions` | Add `column_definitions = None` to CollectionAdapter base |
| C2 | `structure.py:107,110,122` | `collection[index]` | Add `__getitem__` to CollectionAdapter base |

### Category D: SubWorkflowModule (accept materialization)

| Site | File:Line | Approach |
|------|-----------|---------|
| D1 | `modules.py:877-880` | Materialize in `get_collections_to_match` — subworkflow invocation needs real DB objects |

### Category E: Invocation recording (already handled in WIP)

| Site | File:Line | Approach |
|------|-----------|---------|
| E1 | `model/__init__.py:10294` | `isinstance(CollectionAdapter): return` guard |

### Category F: Tag propagation (already handled in WIP)

| Site | File:Line | Approach |
|------|-----------|---------|
| F1 | `managers/collections.py:447` | Iterates `v.dataset_instances` for adapter |

### Category G: CWL-specific (already handled in WIP)

| Site | Approach |
|------|---------|
| `build_cwl_input_dict` | Materialize — scatter needs HDCA IDs |
| scatter subcollection wrapping | Direct HDCA (not adapter) |
| `subworkflow_progress` multi-conn | Materialize |

---

## What's Needed Beyond WIP (`2eeef24cfe`)

The WIP has 90% of the work. Remaining delta:

| File | Change | ~Lines |
|------|--------|--------|
| `adapters.py` | Add `column_definitions = None` and `__getitem__` to `CollectionAdapter` base | +6 |
| `actions/__init__.py` | Fix `_get_on_text` HID assert → conditional skip | ~1 |

That's it. **~7 lines of code** to fix both blockers.

---

## Development Order (Red-to-Green)

### Phase 1: Fix `on_text` HID tolerance
1. `actions/__init__.py:_get_on_text()`: change `assert dataset_collection.hid` → `if dataset_collection.hid:`
2. **Test**: `wf_wc_scatter_multiple_nested` (Path C — hit this blocker first)

### Phase 2: Fix CollectionAdapter interface for `get_structure`/`walk_collections`
1. Add `column_definitions = None` property to `CollectionAdapter` base
2. Add `__getitem__` to `CollectionAdapter` base
3. **Test**: `scatter_multi_input_embedded_subworkflow` (subworkflow test that hit blocker 2)

### Phase 3: Full regression
- All merge path tests (A, B, C)
- Subworkflow merge test
- Basic scatter tests
- PickValue tests
- Previously-green CWL conformance tests

---

## Decision Matrix

| Consumer | Approach | Rationale |
|----------|----------|-----------|
| `on_text` (execute.py, actions) | Fix consumer | 1-2 lines, cosmetic output |
| `matching.py` detection | Already works | `not getattr(hdca, "hid", None)` |
| `structure.py` get_structure/walk | Adapter implements | +4 lines: `column_definitions`, `__getitem__` |
| SubWorkflowModule mapping | Materialize | Subworkflow needs real DB objects |
| CWL scatter | Materialize | Scatter loads HDCAs by DB ID |
| Tool parameter pipeline | Adapter flows through | Serialization/recovery works cleanly |
| Tag propagation | Already handled | WIP iterates `v.dataset_instances` |
| Invocation recording | Already handled | Guard skips adapters |

---

## Unresolved Questions

- Does the legacy Galaxy tool path (non-CWL) exercise merge adapters through matching/slicing? Or do merge connections only occur in CWL workflows?
- `_persist_adapter_as_hdca` creates HDCAs without HIDs. These persist in DB permanently. Cleanup logic? Mark hidden?
- Should `__getitem__` support slices or just int index? `_walk_collections` only uses int.
- Could subworkflow materialization be avoided with a larger refactor? (Not for this iteration.)
