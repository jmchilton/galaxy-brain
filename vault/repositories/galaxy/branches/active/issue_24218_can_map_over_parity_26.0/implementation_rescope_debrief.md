# Re-scope debrief

- Trigger: first scope evaluation recommended expanding modestly: add a `:` boundary to the compound `X:paired_or_unpaired` higher-rank suffix check, on both client and server.
- Original scope saved as `issue_24218_can_map_over_parity_26.0_alt_original_scope` (`d45d2fdb3bc`); see [alts/original_scope.md](alts/original_scope.md).
- Added `d29206dcd71`: `higher_ranks.endswith(f":{higher_ranks_required}")` in `type_description.py` and the same in `collectionTypeDescription.ts` (this also covers the old `!=` guard). Red-to-green asserts on both sides: `paired_or_unpaired` / `list:paired_or_unpaired` over `paired:paired_or_unpaired` → false; `list:paired:paired` → true.
- This is the first server change on the branch. It only affects inputs whose higher ranks end in `paired` (`paired:...:paired_or_unpaired`); no in-tree tool declares one. Server flips: 40 pairs, all true→false.
- Parity harness: 0 `canMapOver` / 0 `canMatch` disagreements over 7744 pairs; effective-type disagreements 121→89 (the remaining ones are the known server `effective_collection_type` follow-up).
- Tests: Python `test/unit/data/dataset_collections` 84 pass; client `src/components/Workflow` 32 files / 200 tests pass.
- Re-scope review ([subagents/normal_review_rescope.md](subagents/normal_review_rescope.md)): nothing to act on.
