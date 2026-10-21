# Polish debrief

Polished 2026-10-17. Head `c217ced0660` → `1187e612f7d` (base `release_26.0` `a6544be047d`), pushed to `jmchilton`.

## CI
Fork CI on `c217ced0660` was queued with no failures. Earlier runs had been cancelled because newer pushes superseded them. The new commits restart CI, so CI is still pending at handoff.

## Checklist (GENERAL + WORKFLOW_RELATED)
- A subagent pass found every item passing, plus 1 real concern. For `paired_or_unpaired` → `list:paired_or_unpaired`, a pair this branch newly rejects, the editor's rejection reason said "inputs requiring pairing, consider using the 'Split Paired and Unpaired' tool". It got that from a bare `endsWith("paired")`. Fixed in `c4a091cdd6e`: the hint now fires only for inputs ending in a `paired` rank. The new reason asserts were red first, at the reason.
- Not acted on:
  - The run-time outcome of saved 💥 workflows was never observed. The description now claims only that the server's `can_map_over` rejects these pairs.
  - The `canMatch` receiver flip in `d45d2fdb3bc` isn't mentioned in its commit message. It is in the description.

## Strengthening (1 round)
- `1187e612f7d`: a terminals test for `paired` into an input declaring Split Paired and Unpaired's `list:paired,list,list:paired_or_unpaired`. It is red at `canAccept` against the pre-fix `collectionTypeDescription.ts` (the editor accepted it) and green at HEAD. It backs the description's in-tree example.
- Corrections to the description:
  - The server change affects every `paired:…:paired_or_unpaired` input (41 pairs), not just two.
  - The issue table is a sample: `record` and `list:record` were also accepted as `""` map-overs, and `paired:paired_or_unpaired` as `"p"` (verified with a base/head script).
  - The new lower-rank Python assert was already green on base.
  - "Line for line" is now "rule for rule apart from `single_datasets`".
- Added a highlighted line on the editor-vs-server scope misreading.
- Client `src/components/Workflow`: 32 files / 201 tests pass (node 22.20.0).

## Left over
- Effective map-over type bugs (`sample_sheet` truncation, server compound ordering) are still a separate 26.0 branch (`scope_evaluation.md` follow-up 1).
- `dev` follow-ups are unchanged (parity table, rank-sorted resolver, `_endsWith`).
