# Alt: original scope

Branch `issue_24303_collection_type_prefix_26.2_alt_original_scope` (`3cb5777162b`, pushed to `jmchilton`). The branch as implemented and test-challenged before the round 1 scope evaluation recommended a modest expansion.

Differs from the parent: the parent additionally fixes the subworkflow editor export over-prepend in `WorkflowContentsManager._resolve_collection_type` (a mapped `type_source`/`type_prefix` output inside a subworkflow exported `list:list:list:paired` instead of `list:list:paired`), and drops the legacy `<output type="collection" collection_type_prefix=…>` spelling (the legacy form has failed to load since 20.09 and has no users). The over-prepend fix also rebuilds the per-input map-over helper on `CollectionTypeDescription`. Both items were found independently by the round 1 Codex review.
