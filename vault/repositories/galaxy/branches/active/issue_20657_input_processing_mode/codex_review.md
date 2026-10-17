# Codex review (hardening pass 2)

Acted on both findings with one server-side fix: `accumulate_with_filter` now keeps all of a history row's options (direct + map-over) on one page, even if that runs past `limit`. That fixes #2 outright and removes the specific #1 scenario, since a refreshed first page now lists both entries for a collection or neither. Did not add server pinning for visible later-page HDCA selections. That is the remaining, pre-existing part of #1.

Commits (worktree, unpushed):
- `550d6b0459b` Baseline tests for accumulate_with_filter paging (new `test/unit/app/tools/test_parameter_pagination.py`)
- `da23ae57e26` Keep a collection's direct and map-over options on one page

Not acted on:
- **Later-page HDCA selections lost on form refresh (residual #1).** `DataCollectionToolParameter._carry_selected_hdca` (and `_carry_unresolved_inputs` for data params) only carries deleted, hidden or foreign HDCAs. It never pins a visible in-history HDCA outside the first page, the way `_pin_live_hda_inputs` does for HDAs. So after `ToolForm.onUpdate` replaces options (`ToolForm.vue:233`), `currentValue` falls back to the first option. This is pre-existing: `basic.py` is unchanged vs base `4fe00d9e7ab`, and base lost any later-page HDCA selection the same way. A fix needs server pinning that carries `map_over_type`, which is scope expansion and a candidate follow-up.
- **No client change to `findDataOption`.** Dropping the `candidates[0]` fallback would turn "silently direct" into "silently first option", which is no better. The round-1 merge-by-identity code and its tests stay, because an offset that lands mid-row (offset = limit after an overshooting page) still re-sends the map-over entry, and the merge dedupes it.

Deliberate test change: the round-2 API test `test_build_collection_options_pagination_splits_direct_and_multirun_entries` pinned the split behavior that this fix removes. It is now `test_build_collection_options_pagination_keeps_direct_and_multirun_entries_together`. It asserts that both entries share a page and that `has_more` is false when the nested list is the last listed HDCA (via search). It also asserts that an offset landing between the two entries resumes at the map-over entry. This is a behavior inversion, not a weakened assertion.

Tests:
- Unit `test_parameter_pagination.py`: the new split-row test failed before the fix and passes after it. All 3 tests pass, and `test_data_parameters.py` passes (23 total).
- API: the renamed test fails against the old `pagination.py` (page 0 returns only the direct entry, with has_more false) and passes with the fix. All 12 `build_collection_options` / `build_data_options` API tests pass on one server.

<details>
<summary>Findings and verdicts</summary>

### 1. (P1) Form refresh resets a later-page map-over selection to direct (`client/src/components/Form/Elements/FormData/types.ts:139`)

**CONFIRMED on the branch as written.** `findDataOption` falls back to `candidates[0]` (types.ts ~L139). `ToolForm.onUpdate` assigns `formConfig.value = data` (ToolForm.vue:233), which replaces the merged pages with page 0. The FormData options watcher (`FormData.vue` ~L1099) re-emits `createValue(currentValue)`, and `isBatchSelection` then sees a direct value. The server can't help, because `_carry_selected_hdca` (`basic.py` ~L3071) skips visible in-history HDCAs. The precondition is a page ending on the direct entry with the map-over entry on the next page, which `accumulate_with_filter` allowed.

**Resolution:** the precondition is gone after `da23ae57e26`, because a row's entries are never split across a page boundary. A first-page refresh therefore lists both entries for an item or neither. In the "neither" case the selection is lost entirely, which is the pre-existing base behavior for any later-page HDCA (see "Not acted on").

### 2. (P2) A split option on the final DB row is never offered for loading (`lib/galaxy/tools/parameters/pagination.py:130`)

**CONFIRMED.** `has_more = db_offset < pre_filter_total` counts rows. Hitting `limit` inside the last row's emitted list left `db_offset == pre_filter_total`, so `has_more` was false and the map-over entry could only be reached by an explicit offset request. The red API run reproduced this: with the nested list as the last listed HDCA and limit 1, the response was `[direct]` with `has_more: false`. The emission was pre-existing on base, but the round-1 comment on this branch made the split an explicit contract.

**Fix:** the limit check moved from the per-entry loop to after the whole row is emitted. Skipping still counts individual entries, so post-filter offsets keep their meaning. A page can exceed `limit` by at most entries-per-row minus 1, which is 1 today (only the `DataCollectionToolParameter` classifier returns lists). The `chunked=False` path already slices by row. The comment and docstring are updated.

</details>
