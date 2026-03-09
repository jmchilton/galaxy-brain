# Plan: Complete `paired_or_unpaired` Subtyping at Any Rank

## Problem Statement

`paired` is treated as a subtype of `paired_or_unpaired` only at the **deepest (innermost) rank**:

- `list:paired` -> `list:paired_or_unpaired` -- WORKS today
- `paired:list` -> `paired_or_unpaired:list` -- BROKEN, should work
- `list:paired:list` -> `list:paired_or_unpaired:list` -- BROKEN, should work

## Affected Code: 3 Parallel Implementations

### Layer A: TypeScript (`collectionTypeDescription.ts`)

Three methods all use `endsWith(":paired_or_unpaired")` -- never checking middle positions:

1. **`canMatch`** (lines 87-109) -- determines if output type can satisfy input type
2. **`canMapOver`** (lines 110-146) -- determines if collection can be mapped over input
3. **`effectiveMapOver`** (lines 147-194) -- computes effective map-over type after consuming input

### Layer B: Python (`type_description.py`)

1. **`can_match_type`** (lines 106-124) -- Python equivalent of `canMatch`, same `endswith` limitation
2. **`has_subcollections_of_type`** (lines 76-99) -- only handles `paired_or_unpaired` as entire subcollection type

### Layer C: Python (`subcollections.py`)

1. **`_is_a_subcollection_type`** (lines 28-34) -- uses `endswith` check
2. **`_split_dataset_collection`** (line 52) -- uses exact equality `child_collection.collection_type == collection_type`

### Layer D: Python (`basic.py` line 2668)

Tool parameter presentation only handles terminal `paired_or_unpaired`.

## Core Algorithm: Rank-by-Rank Comparison

Subtyping should be applied **rank-by-rank**. New helper function (needed in both TS and Python):

```
canMatchRankByRank(thisType, otherType):
    thisRanks = thisType.split(":")
    otherRanks = otherType.split(":")
    if len(thisRanks) != len(otherRanks): return false
    for (thisRank, otherRank) in zip(thisRanks, otherRanks):
        if thisRank == otherRank: continue
        if thisRank == "paired_or_unpaired" and otherRank == "paired": continue
        return false
    return true
```

Same comparison needed for suffix matching during map-over calculations.

## Detailed Changes

### Step 1: TS `collectionTypeDescription.ts` -- Add `_canMatchRanks` helper
### Step 2: TS `canMatch` -- Replace `endsWith` logic with rank-by-rank helper
### Step 3: TS `canMapOver` -- Update suffix matching to be subtype-aware
### Step 4: TS `effectiveMapOver` -- Correctly compute map-over for non-terminal positions
### Step 5: Python `type_description.py` `can_match_type` -- Same rank-by-rank logic
### Step 6: Python `type_description.py` `has_subcollections_of_type` -- Handle compound subcollection types
### Step 7: Python `type_description.py` `effective_collection_type` -- Fix string length subtraction
### Step 8: Python `subcollections.py` `_is_a_subcollection_type` -- Rank-by-rank suffix matching
### Step 9: Python `subcollections.py` `_split_dataset_collection` -- Subtype-aware element comparison
### Step 10: Python `basic.py` -- Handle non-terminal `paired_or_unpaired` in tool parameter presentation

## Test Plan (Red-to-Green)

### A: TS Unit Tests (`terminals.test.ts`)

Add to `parameter_steps.json`:
- `paired_or_unpaired:list collection input`
- `paired:list input`

New test cases:
1. `"accepts paired:list -> paired_or_unpaired:list connection"` -- direct match at non-terminal rank
2. `"rejects paired_or_unpaired:list -> paired:list connection"` -- inverse must NOT work
3. `"accepts list:paired:list -> paired_or_unpaired:list connection"` -- map-over with non-terminal subtyping
4. `"accepts list:paired:list -> list:paired_or_unpaired:list connection"` -- outer match + inner subtyping
5. `"accepts paired:paired -> paired_or_unpaired:paired connection"` -- first rank subtyping

### B: Standalone `collectionTypeDescription.test.ts`

Focused unit tests:
- `canMatch("paired_or_unpaired:list", "paired:list")` -> true
- `canMatch("paired:list", "paired_or_unpaired:list")` -> false
- `canMatch("paired_or_unpaired:paired", "paired:paired")` -> true
- `canMatch("list:paired_or_unpaired:list", "list:paired:list")` -> true
- `canMapOver` and `effectiveMapOver` tests for non-terminal positions

### C: Python Unit Tests

- `can_match_type("paired:list")` on `CollectionTypeDescription("paired_or_unpaired:list")` -> True
- `has_subcollections_of_type("paired_or_unpaired:list")` on `CollectionTypeDescription("list:paired:list")` -> True
- Splitting tests for `_split_dataset_collection`

### D: API Integration Tests

In `test_tool_execute.py`:
- Tool with `paired_or_unpaired:list` input using `paired:list` collection
- Map-over: `list:paired:list` -> `paired_or_unpaired:list` input

### E: Spec Updates

Add examples to `collection_semantics.yml`, remove limitation disclaimer (lines 556-563).

## Implementation Order

1. **Write failing tests** (TypeScript + Python)
2. **Implement TypeScript changes** (add helper, update 3 methods)
3. **Implement Python changes** (add helper, update 5 locations)
4. **API integration tests** (end-to-end)
5. **Update spec**

## Edge Cases

- **Multiple `paired_or_unpaired` ranks**: `paired:paired` matching `paired_or_unpaired:paired_or_unpaired` -- rank-by-rank handles naturally
- **`single_datasets` semantics at non-terminal position**: Should `list:list` match `paired_or_unpaired:list`? This is separate from `paired` <: `paired_or_unpaired` -- potentially defer
- **Runtime adapter wrapping**: `PromoteCollectionElementToCollectionAdapter` may need to wrap at appropriate level during `_split_dataset_collection`
- **No existing tools use `paired_or_unpaired` at non-terminal rank** -- test tool XML may be needed

## Critical Files

| File | Change |
|------|--------|
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Core TS matching: `canMatch`, `canMapOver`, `effectiveMapOver` |
| `lib/galaxy/model/dataset_collections/type_description.py` | Core Python matching: `can_match_type`, `has_subcollections_of_type`, `effective_collection_type` |
| `lib/galaxy/model/dataset_collections/subcollections.py` | Runtime splitting: `_is_a_subcollection_type`, `_split_dataset_collection` |
| `lib/galaxy/tools/parameters/basic.py` | Tool parameter presentation (line 2668) |
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | TS test cases |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Update spec |

## Unresolved Questions

1. Should "single_datasets" semantics (`list` matching `paired_or_unpaired`) extend to non-terminal positions? Or defer?
2. Any existing Galaxy tools/workflows use `paired_or_unpaired` at non-terminal rank? Need test tool XML?
3. `effective_collection_type` uses string slicing -- when input type has `paired_or_unpaired` but actual collection has `paired`, lengths differ. Compute from actual or input type string?
4. Coordinate with tool authors who might want `paired_or_unpaired:list` inputs, or purely infrastructure?
