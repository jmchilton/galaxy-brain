# Re-scope debrief

Scope evaluation (round 1, now in `earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion; the original hardened scope is kept as `issue_24220_drop_collection_matching_26.0_alt_original_scope` (`27146fc2ef7`, see [alts/original_scope.md](alts/original_scope.md)).

Added, red first:

- **Column definitions only on direct drops** (`f27b81ba974`): a map-over drop onto a `sample_sheet` input with column definitions was refused although the server's dropdown lists it. Baseline tests now pin the direct-drop column check (same columns accepted, others refused), which had no client tests.
- **Empty `collectionTypes` = no constraint** (`9f415f837f5`): `canAcceptSrc` refused every collection for `[]` while `toDataOption` accepted. Both now read one `restrictedCollectionTypes` computed. Baseline rows for `null`.

Not taken: the workflow editor's declared-order `_effectiveMapOver` (different surface, no shipped trigger; 24218 or dev follow-up), the async tool-request `dce` gap (server), collapsing the double match (pure refactor).

Post-rescope review: no must-fix; see [subagents/normal_review_2.md](subagents/normal_review_2.md). Open decision: the column-definition relaxation matches the server dropdown, but the mapped jobs get column-less lists — maybe the server listing should be the one to change.
