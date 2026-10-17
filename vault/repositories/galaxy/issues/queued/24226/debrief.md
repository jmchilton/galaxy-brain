# Debrief: effective map-over type (sample_sheet + compound paired_or_unpaired)

Source: [effective_map_over_type_sample_sheet_and_compound.md](effective_map_over_type_sample_sheet_and_compound.md), queued from the #24218 branch hardening. Proposal: [proposed_effective_map_over_type_sample_sheet_and_compound.md](proposed_effective_map_over_type_sample_sheet_and_compound.md).

## Outcome

The source's two families were split. Only family 2 (server compound) became the proposal. Family 1 (sample_sheet) had a wrong premise. It's a decision for John, not an issue.

## Family 2: server compound `:paired_or_unpaired`. Real, filed as the proposal

- Reproduced on `release_26.0` (#24218 head `d29206dcd71`) and `origin/dev` (`7c86d742327`). The code in `effective_collection_type` is the same on both.
- Rule: the mapped type ends in `:` + the full input type, and the input ends in `:paired_or_unpaired`. The server under-strips by one rank. 63 pairs up to rank 4 on dev; 75 on 26.0 (the extra 12 involve sample_sheet).
- The source's examples were partly off. `list:list:paired` over `list:paired_or_unpaired` is *correct*; only exact-suffix pairs are wrong. The source's "6 rows" and "89 disagreements" came from the harness and aren't used in the issue.
- Runtime effect, shown at unit level with `get_structure` and the `test_matching.py` builders: 4 leaves/jobs instead of 2, each a `paired_or_unpaired` instead of a `list:paired_or_unpaired`. This is the same tree as a plain `paired_or_unpaired` input. No API run, and the issue says so.
- The client is correct for these pairs, so the editor and runtime disagree.
- Review subagent (one round): everything reproduced, and no duplicate on GitHub. It tried the proposed fix (direct normalized-suffix check, stripping by rank before the peel-off) on a temporary copy:
  - All 86 tests in `test/unit/data/dataset_collections/` pass.
  - 75 → 0 wrong pairs.
  - The only other results that changed were sample_sheet-input pairs, which were garbage before.
  - Its edits: "runs" → "would run"; one sentence noting the fix also stops server sample_sheet truncation on 26.0 while the client keeps it.

## Family 1: sample_sheet truncation. Wrong premise, dropped

- The truncation reproduces on 26.0 on both sides (`list:list` over `sample_sheet` gives `""`, `"l"`, `"lis"`, …).
- But #22565 (merged for 26.1 on dev) deliberately makes both client `canMapOver` and server `can_map_over` reject a non-sample_sheet collection mapped over a `sample_sheet*` input, since a plain list lacks the column metadata. On dev, every sample_sheet row is rejected (client `null`, server `ValueError`). Enumeration found 0 accepted sample_sheet-input map-overs on dev, so the truncating strip can't be reached there.
- So the source's "expected `list`" and its "not recommended: reject the connection" are both wrong. Rejecting is upstream's choice. `scope_evaluation.md` section H and the follow-up 1 on the #24218 branch carry the same premise and should be corrected.
- **decide:** backport #22565's sample_sheet guard to 26.0, either on the #24218 branch (same parity area) or separately, or leave 26.0 alone. Note: the family-2 fix stops server-side truncation on 26.0 as a side effect, but the client still accepts and truncates.

## Recommendation

File family 2 as-is, targeting `release_26.0`. Realistic shapes exist (`list:list:paired_or_unpaired` from nested sample groupings), the job layout is wrong, and the fix is small with tests.

## Leftovers

- No API-level run yet. Add one in the fix PR.
- Correct section H of the #24218 scope evaluation.
- Scratch scripts are in the session scratchpad (`enum_pairs.py`, `diff_all.py`, `fixed_td.py`). They're temporary.
