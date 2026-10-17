# Re-scope debrief

Scope evaluation recommended a modest expand. On 26.1 a collection listed directly and mapped over (e.g. `list,list:list` input + `list:list`) shares one selection key and label, so the map-over row the paging fix now delivers can't be picked. A probe vitest on `e4a0f756c63` confirmed it: a required input showed `['9: nested', '9: nested']`, both rows marked selected, and clicking the map-over row emitted nothing. This is a functional bug, not just how it looks.

Original scope is kept as alt `issue_24221_paged_map_over_options_26.1_alt_original_scope` (`e4a0f756c63`, [alts/original_scope.md](alts/original_scope.md)).

Added commit `e625fd88f5d` (client only, ~+165/-31, hand-ported selection-identity parts of dev `05907884de9`/`9eff87c8e21`):
- `itemUniqueKey` includes `map_over_type`; `pageMergeKey` deleted. Added `isSameItem` and `findDataOption`, which try the exact key first, then the same item, so values without a map-over type fall back to the direct entry.
- `FormData.vue` value lookups, keep-option cache and replacement, `createValue` dedupe, `handleIncoming`, `normalizeOption`, `matchedValues` and the drag-enter duplicate check now use the helpers.
- Collection inputs label map-over options with ` (one job per <unit>)`. The unit comes from `collectionTypeToText`; `single_datasets` becomes "dataset". Dataset inputs get no suffix.
- Left out: dev's badge/slot and processing hint (20657), drop map-over picker (#24220), WorkflowRun merge refactors.

Tests: new FormData cases cover selecting map-over, a map-over value selecting only its row, labels, and no suffix on dataset inputs. A value without `map_over_type` resolving to the direct row went into the baseline commit and passes on base. The `findDataOption` cases are in types.test.ts. They were red before (6 failing), green after. Vitest Form/Tool/Workflow/Run 300/300, vue-tsc 0.

Known, not fixed: `/build` doesn't echo `map_over_type` in `value`, so a server-seeded value (first load, rerun) resolves to the direct entry. User picks survive rebuilds because `value` is client-owned.

Post-rescope review: [subagents/normal_review_rescope.md](subagents/normal_review_rescope.md).
