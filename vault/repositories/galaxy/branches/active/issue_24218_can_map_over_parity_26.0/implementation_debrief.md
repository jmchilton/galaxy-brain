# Implementation debrief

STATUS: READY. Head `d29206dcd71`, base `release_26.0` (`a6544be047d`), pushed to `jmchilton`.

## Commits
- `3e3b6d75e8b` Baseline tests: new `collectionTypeDescription.test.ts` pins `canMapOver` cases already agreeing with server.
- `0e9a619bda4` `canMapOver` in server `has_subcollections_of_type` rule order (source from `00e2bf07047`, fresh message). Fixes the issue's 6 rows; 2 terminals tests cover the 💥 editor rows.
- `d45d2fdb3bc` `getCollectionTypeFromInput` resolves `collection_type_source` like server `create_collection`: map-over → declared input type, direct match → connected type. Needed: the old `canMapOver` masked a reversed `canMatch`; without this, `list` → `list:paired_or_unpaired` source resolved to ANY (normal review), and the first fix attempt returned the broader declared type (Codex, confirmed against `tools/actions/__init__.py`).
- `d29206dcd71` (re-scope) `:` rank boundary on compound `X:paired_or_unpaired` higher-rank check, client + server. Only affects `paired:…:paired_or_unpaired` inputs; no in-tree tool declares one.

## Validation
- Red-to-green for every new test (verified twice by test-challenge passes).
- Client `src/components/Workflow`: 32 files / 200 tests. Python `test/unit/data/dataset_collections`: 84.
- Parity harness (scratchpad): 0 `canMapOver` / 0 `canMatch` disagreements over 7744 type pairs.
- Hardening (re-run after re-scope): test challenges, Codex (0 findings), thermo-nuclear (approve), baseline refactor (none), scope evaluation (keep), screenshots (not relevant). First-round debriefs in `earlier_drafts/1/`.

## Scope
- Re-scoped once (boundary fix); original scope kept as `issue_24218_can_map_over_parity_26.0_alt_original_scope` (client-only, use it if a server change on 26.0 is unwanted).
- Merge-forward: `collectionTypeDescription.test.ts` add/add conflicts with the 26.1+ file; keep both `describe` blocks.

## Follow-ups (not done, see scope_evaluation.md)
1. Separate 26.0 branch: effective map-over type bugs — server `effective_collection_type` for `list:list:paired_or_unpaired` over `list:paired_or_unpaired` gives `list:list`; `sample_sheet` map-overs truncate the effective type on both sides (`list:list` over `sample_sheet` → `""`).
2. Dev: shared client/server parity table with pinned expectations.
3. Dev: one rank-sorted declared-type resolver for `_effectiveMapOver` + `getCollectionTypeFromInput`; server `create_collection` direct-match-first (client in same change).
4. Dev: drop `_endsWith` for native `endsWith`.
