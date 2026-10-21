# Re-scope debrief (round 1)

Round 1 scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion. The round 1 Codex review (`earlier_drafts/1/codex_review.md`) independently found the same two defects. Original scope kept as `issue_24303_collection_type_prefix_26.2_alt_original_scope` (`3cb5777162b`, [alts/original_scope.md](alts/original_scope.md)).

## Changes

1. **Subworkflow editor export over-prepend** (new commit "Resolve sliced type_source type in subworkflow editor export").
   - Bug: `WorkflowContentsManager._resolve_collection_type` prefixed the full upstream type, then prepended the step map-over. A `list:paired` input mapped into a `type_source`/`type_prefix` tool inside a subworkflow exported `list:list:list:paired` instead of `list:list:paired`. The same bug hit plain `type_source`.
   - Fix: `get_step_map_over` is split into shared typed helpers. `_input_map_over` is rebuilt on `CollectionTypeDescription`: it checks for a direct `accepts` match first, then the shortest `can_map_over`, and returns `(map_over, slice)`. The type_source input's own slice is prefixed, then the step-wide map-over is prepended.
   - Side effect (an improvement) on `get_step_map_over` for subworkflow export: `paired` into a `paired_or_unpaired` input, and `sample_sheet` into a `list` input, are now direct connections. `list:paired` into a `paired_or_unpaired` input now maps over `list`.
   - This is path 4 of the queued resolution-order issue, now fixed here.
2. **Legacy `<output type="collection">` form.** The first attempt repaired the remap with a deep copy. The re-scope review then found the form has failed to load since the 2020 lxml switch and has no users, so that commit was dropped. `collection_type_prefix` is removed from the legacy remap and the XSD `Output`. Rejecting the form clearly is queued as `gx_issues/to_file/legacy_output_collection_form_broken.md`.

## Review

[subagents/rescope_review.md](subagents/rescope_review.md). Acted on: reject the legacy form, rebuild on `CollectionTypeDescription`, typing, trim the tests and add `paired_or_unpaired`/`sample_sheet` cases. `..._other_input_mapped` wasn't red; it's kept as a regression guard.

## Results

13 commits, head `8e5ae068ddf`. 523 unit tests pass. API `test_workflows.py -k export_editor` passes 9/9. The changed commits were verified individually in temporary worktrees.

## Known mismatch

The server subworkflow export now gives the per-job slice (e.g. `paired`), while the editor client gives the declared accepted type (`paired_or_unpaired`). This only affects display, and it's covered by the queued resolution-rule issue.
