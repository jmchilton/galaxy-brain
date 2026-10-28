# Scope evaluation

**Recommendation: keep as implemented.** After two expansions, the branch fixes every no-history conversion failure reachable from the API endpoints it touches: custom builds (#24529), `converted/{ext}` including pending dependencies (202), and feature search. These all go through one `HistoryManager.get_converted_dataset`. The remaining candidates are either not reachable from these endpoints with API keys, or they need a model change that would diverge from 26.2's rewrite (`261d166f2ab`). Neither is a modest expansion on release_26.0.

## Possible Decompositions

The branch is about 230 added lines across 8 files.
- **A:** refactors (`a5de02c79cf`, `f7603faeb1f`), then the backport (`897eabb92b3`), then the encode fix (`bb3f23dc1c9`), then the #24529 fix (`814c879279f`), then the 202 fix (`025d2d5450c`). One PR, in this commit order.
- **B:** the backport `a3cb32cd95d` as its own PR first, then the rest. The 202 test depends on it.
- **C:** the encode_id fix as a standalone PR. Its test currently lives in the fix commit, so it would need its own assertion.

## Scope: as implemented

Conversions from the API run in an active history the requester owns. The lookup order is:
1. the dataset's own history
2. the current history
3. the most recent history

If none exists, the request gets a 400. A pending dependency gets a 202. Also included: double-encoded ids are fixed, and the dependency-context backport.

| Pros | Cons |
|---|---|
| One shared helper serves all three endpoints | About 230 lines on a release branch |
| Every new test fails on base | A dependency that keeps failing is re-queued on every poll and returns 202 |

## Scope: errored or failing dependency handling (polling job pile-up)

Stop re-queuing errored dependencies, and report them as a 4xx.

| Pros | Cons |
|---|---|
| Fixes an endless polling loop | The re-queue behaviour lives in model `get_converted_dataset` and differs on 26.2 |
| | A model change on release_26.0 would conflict on merge-forward. Better done on dev |

## Scope: remaining callers (genomes, dbkeys, data-provider registry, model `convert_dataset`)

| Pros | Cons |
|---|---|
| The same `history=` omission elsewhere | For genomes and dbkeys, the dbkey owner may be a different user, so a policy decision is needed. The registry needs a signature change |
| | Not API-key endpoints for this bug. dbkeys usually finds the `len` already created |

## Scope: contract to #24529 only

The alt branch `_alt_original_scope` already holds this version.

| Pros | Cons |
|---|---|
| Smallest diff | Leaves `converted/{ext}` returning a 500 for API keys |
