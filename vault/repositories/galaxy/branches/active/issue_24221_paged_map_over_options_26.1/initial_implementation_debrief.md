# Initial implementation debrief

Backport of the #24221 fix from `issue_20657_input_processing_mode` onto `release_26.1` (`dbe4f2f7e41`).

Commits:
1. `2203d0d3d95` Baseline tests for option paging — cherry-pick of `76750495c46`. Unit tests for `accumulate_with_filter` single-match/filtered paging, API test pinning the old split (direct on offset 0, map-over on offset 1). Passed on base (unit 2/2, API `test_build_collection_options*` 7/7).
2. `660ae0a0b5d` Server: `accumulate_with_filter` finishes the row it is on (drop inner `break`), comment fixed. Cherry-pick of `562ce4f58fa` with dev's final comment; the 26.1 file otherwise only differed in `Optional`/`Union` typing. New unit test red on old impl, green on fix; API test rewritten to assert both entries on one page, `has_more` false when the nested list is last.
3. `8a0a1b3307b` Client: `mergeDataOptions` in `FormData/types.ts`, keyed on src+id+map_over_type, used by `ToolForm.vue` and `WorkflowRunDefaultStep.vue`. Hand-ported: dev's commits did not apply (26.1 forms are Options API, dev's ToolForm is `<script setup>`). Kept `itemUniqueKey`/`containsDataOption`/`FormData.vue` unchanged — on dev the key change came with the larger 20657 map-over UI work. New `types.test.ts` (4 cases) instead of dev's `ToolForm.test.ts` case; red with an id+src key (2 fail), green with the fix.

Verification: unit pagination 3/3; vitest FormData + ToolForm + Workflow/Run 59/59 (node 22.20.0); vue-tsc clean; eslint clean; API `test_build_collection_options or test_build_data_options or pagination` 13/13.

Not done: red run of the new API test against the old server (it was red on dev; unit red covers the same path).
