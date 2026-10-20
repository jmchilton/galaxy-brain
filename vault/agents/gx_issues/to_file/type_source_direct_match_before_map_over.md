# type_source resolves map-over before direct match (runtime) and first-declared-wins (editor)

Source: research for #24303 (`type_prefix`), branch `issue_24303_collection_type_prefix_26.2` (record `vault/repositories/galaxy/branches/active/issue_24303_collection_type_prefix_26.2/`). John chose to file separately rather than fix in #24303 (2026-10-20). Refs pinned to `release_26.2` `e2649e52818`; re-pin against `dev` before filing.

## Problem

A tool output `<collection type_source="input"/>` should get the type of the collection actually bound to `input`. When an input declares several collection types where one can map over another (e.g. `collection_type="list,list:list"`, or `list:paired_or_unpaired` vs `list:paired`), the runtime, the precomputed mapped structure, the workflow editor and the server-side subworkflow editor export each resolve `type_source` with a different rule. Latent today (no in-tree tool hits it, as far as known); #24303 `type_prefix` inherits it; Nest 1.1.0 (`list,list:paired`) should be unaffected: a `list:paired` HDCA can't map over `list` (suffix must match) — confirm with the #24303 Nest tests.

## The four paths

1. **Non-mapped runtime** `lib/galaxy/tools/actions/__init__.py:1232-1238` `OutputCollections.create_collection`: calls `HistoryQuery.can_map_over(hdca)` **first**; only falls back to `hdca.collection.collection_type` if that's falsy. `can_map_over` (`model/dataset_collections/query.py:69-81`) returns the first declared description (ranked by dimension, descending, `from_collection_types` 37-50) the HDCA can map over. A `list:list` HDCA bound **directly** (no mapping — tool form offers direct and multirun separately `tools/parameters/basic.py:3234-3248`; workflows check `direct_match` first `workflow/map_over.py:86`) to an input accepting `list,list:list` → `can_map_over` returns `list` → output created as `list` while the job got a `list:list`. Expected `list:list`.
   - In the mapped case `input_collections[src]` is a DCE whose `.collection` is the parent, so `can_map_over` there is effectively "which declared type are we mapping over" — correct for that case. The function conflates the two.
2. **Mapped precompute** `model/dataset_collections/structure.py:214-217` `tool_output_to_structure`: uses the sliced input's leaf subcollection type, which is the **concrete** subcollection type picked by tool form (`tools/parameters/meta.py:474-501`) / workflow (`workflow/map_over.py` `_concrete_subcollection_type`) — not the declared type. With a `paired_or_unpaired`-declared input mapped over a `list:paired`, precompute says `paired`, each job's `create_collection` says `paired_or_unpaired` (declared via `can_map_over` on the DCE parent). Implicit outer collection and per-element types disagree.
3. **Workflow editor** `client/src/components/Workflow/Editor/modules/terminals.ts:863-876` `OutputCollectionTerminal.getCollectionTypeFromInput`: first **declared-order** entry where `accepts(other) || other.canMapOver(ct)` — not rank-ordered like the server, and returns the declared type even on a direct match (connected type only for `any`). `list:paired` connected to a `list:paired_or_unpaired` input → editor `list:paired_or_unpaired`, runtime `list:paired`.
4. **Server editor export, subworkflows only** `lib/galaxy/managers/workflows.py:1764-1789` `_resolve_collection_type`: copies the full upstream output type, then prepends step map-over. A `list:list:paired` connected to an input accepting `list:paired` may produce `list:list:list:paired` (map-over `list` + full upstream type). **Unverified** — read from code; write a failing test first.

## Proposed rule

One shared resolution: direct match → connected collection's own type (runtime) / declared-accepting type normalized (editor needs a decision: connected vs declared, e.g. `list:paired` into `list:paired_or_unpaired`); else → the declared type mapped over. Same rule in all four paths; ideally one server helper used by `create_collection` and `tool_output_to_structure` (the #24303 branch adds a shared prefix helper at those same two sites — natural place to extend).

## Blast radius

Every `type_source` DB-op tool goes through path 1: filter_failed/empty/null/keep_success (all versions), filter_from_file, harmonize, merge, relabel, sort, tag. Check each declares a single type or non-overlapping types before claiming "no behavior change".

## Tests to write (red first)

- API: test tool with `collection_type="list,list:list"` + `type_source`, run directly on a `list:list` → expect `list:list` output (expected red on path 1).
- Unit: `tool_output_to_structure` with `paired_or_unpaired` declared input mapped over `list:paired`.
- Vitest `terminals.test.ts`: declared-order dependence (`list,list:list` vs `list:list,list`) and `list:paired` → `list:paired_or_unpaired` input.
- API `test_workflows.py`: subworkflow editor export with `list:list:paired` into `list:paired`-accepting `type_source` tool (verifies/refutes path 4).
- Link from `collection_semantics.yml` "Output Collection Types" section (added in #24303).

## Related

- #24303 (`type_prefix`), #24190 (Nest `list:paired`, superseded by the #24303 branch), #23444, #23886, #23897 (adjacent `type_source` work — check overlap).
