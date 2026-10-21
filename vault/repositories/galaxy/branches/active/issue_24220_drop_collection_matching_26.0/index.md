# issue_24220_drop_collection_matching_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24220_drop_collection_matching_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24220_drop_collection_matching_26.0)

## Status

Status: `branches_implemented`. READY: implemented, re-scoped once, re-hardened; head `6abce38796f`. Base `release_26.0`, stacked on `issue_24218_can_map_over_parity_26.0` (`c217ced0660`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24220_drop_collection_matching_26.0`.

No PR yet. Fork CI greenish on `6abce38796f` (2026-10-20, see TICK).

Fixes galaxyproject/galaxy#24220: tool form drag and drop matched collections to collection inputs by plain string suffix. Carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[Implementation](implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [scope evaluation](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## Decisions

- Base `release_26.0`, per the issue: 26.0 has the server's `:` boundary (#22193) and `sample_sheet` normalization, so the fixed client agrees with the dropdown. 25.1 not targeted.
- Stacked on [`issue_24218_can_map_over_parity_26.0`](../../merged/issue_24218_can_map_over_parity_26.0/index.md): #24220 needs its `canMapOver` fix. Open/merge 24218 first; rebase onto `release_26.0` once it lands, or onto 24218 if that moves again.
- Option-dedupe changes from 20657 (`68b8d3969e5`) left out; not needed for drop matching.
- Alt `issue_24220_drop_collection_matching_26.0_alt_original_scope` keeps the pre-re-scope fix ([alts/original_scope.md](alts/original_scope.md)).

## Open decision

Map-over drops onto a column-defined `sample_sheet` input are now allowed, matching the 26.0 dropdown; jobs get plain lists without column data. Keep, or file a server issue to tighten `match_multirun_collections` and revert the client guard.

## TICK — 2026-10-20

Fork CI on `6abce38796f`: all green except Playwright shard 2, `test_dataset.py::test_history_dataset_update_annotation_and_info` (`Element is not attached to the DOM` on the dataset annotation editor). Branch changes tool-form drag and drop only, so unrelated flake; failed job rerun ([run 39051517189](https://github.com/jmchilton/galaxy/actions/runs/39051517189)). CWL conformance skipped (not exercised). Promoted to `branches_implemented`.
