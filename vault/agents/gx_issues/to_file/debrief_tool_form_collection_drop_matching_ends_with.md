# Debrief: tool_form_collection_drop_matching_ends_with

Review round (step 2 + 3 of PREPARE_TO_FILE.md), 2026-10-17. Sources: raw draft `tool_form_collection_drop_matching_ends_with.md`, proposal `proposed_tool_form_collection_drop_matching_ends_with.md`, galaxy `origin/dev` 7c86d742327 plus release_25.1 / 26.0 / 26.1 / 26.2.

## Research summary

- **Client rows now pinned by a real component run, not a simulation.** I extracted `client/` at `b89794a9f36` with `git archive` into the scratchpad, symlinked the feature worktree's `node_modules`, and ran a 12-case vitest spec with node 22.20.0 via pnpm. All cases pass. The spec mounts `FormData.vue`, drops each table item and asserts the alert or emitted value. Its `FormData.vue` matching logic is identical to `origin/dev`: the diff is only label and checkbox changes. Caveat: workspace `packages/ui` resolved through the symlink into the `tool_form_job_count` worktree. That doesn't touch drop logic. The worktree was not changed.
  - Refused with "is not a valid input": `paired_or_unpaired` <- `paired`, `list`, `list:paired`; `list:paired_or_unpaired` <- `list`, `list:paired`; `list` <- `sample_sheet`.
  - Accepted with `{batch: true, map_over_type: "paired"}`: `paired` <- `list:paired_or_unpaired` and `paired` <- `paired_or_unpaired`.
  - `paired,list:paired` <- `list:list:paired`: maps over `paired`. `list,list:list` <- `list:list:list`: maps over `list`.
  - A `list:list` DCE on `list` sends `{batch: false, values: [{src: "dce", map_over_type: null}]}`.
  - `paired` on `list:paired_or_unpaired` is refused, which is correct today.
- **Server side** was read in the code (dev):
  - `type_description.accepts` / `can_map_over`, `HistoryQuery.from_collection_types` (sorts by dimension desc; its comment names the declaration-order case), and the `paired_or_unpaired` adjustment in `DataCollectionToolParameter._classify_hdca`.
  - In `subcollections._split_dataset_collection`, a bare `paired_or_unpaired` or a `list:paired_or_unpaired` always fails with `paired`: the `paired_or_unpaired` level has dataset elements with no `child_collection`. So "Cannot split collection" is unconditional, and `test_paired_or_unpaired_not_consumed_by_paired_when_mapping` asserts it.
  - `meta.__expand_collection_parameter` supports `dce` + `map_over_type` on 25.1 and on dev. `from_json` has no collection-type check.
- **Attributions verified:**
  - #18623 = 44116020306 added the `canAcceptSrc` `endsWith`.
  - #22170 (dev) contains 959b6076d63, the server colon boundary. #22193 is its 26.0 backport.
  - #20315 is FastQC (`data` input) DCE map-over, and #19900 fixed it.
  - #21271, #20657 and #19234 are open with matching titles.
- **Line numbers:** 25.1 / 26.0 L469 / L661, 26.1 L597 / L876, 26.2 L619 / L898, dev L617 / L896.
- **Declaration-order row:** no shipped tool found. Galaxy core tools and the one tools-iuc hit use `list,list:paired`, where order doesn't matter. Only the test tools `collection_list_or_nested_list_input` (`list,list:list`), `collection_paired_or_list_paired_input` and `collection_list_2x_or_3x_nested` declare a shallower type before a deeper one that ends with it. galaxytools, tools-devteam and tools-iwc-lab had no multi-type hits.

## Corrections vs raw draft

- "server would not list it" (`paired` <- `list:paired_or_unpaired`) holds only on 26.0 and later. The 25.1 listing has the same suffix bug. The proposal already footnoted this.
- The 26.1 line "~L593" is the `isHDCA` gate. The checks are at L597 / L876.
- "runs one job on the whole thing (or errors)" is now pinned: the client sends `batch: false` with no `map_over_type`.
- The draft missed the `paired_or_unpaired` <- `paired` direct-accept refusal, the `sample_sheet` and declaration-order rows, and the run-time failure. The proposal added them.

## What review changed

- Declaration-order row: switched to `list,list:list` <- `list:list:list`. It matches the branch's red test and a named test tool. Footnote ² says no shipped tool was found.
- Added one line saying where the client and server columns come from: the vitest mount, and server code plus the API test.
- Clarified where the split fails, and that the server does map over DCEs.
- Context: #19900 "enabled dropping DCEs" became "fixed map-over of dropped collection elements on `data` inputs". The sibling dependency moved out of Context.
- Proposed Approach: replaced "the `X:paired_or_unpaired` map-over rows need the sibling fix", which pointed at no row, with the real risk. Without the sibling fix, the helper would start accepting `paired` on `list:paired_or_unpaired`.
- Approach details:
  - Fixed the test list to match branch HEAD (tests split across `FormData.test.ts` / `FormData.mapOver.test.ts`).
  - Dropped the claimed "`paired` on `paired_or_unpaired` accepted directly" test, which doesn't exist, and listed the direct-accept and `sample_sheet` tests as still to add.
  - Noted the helper now lives in `collectionMatch.ts`.
  - Added the 25.1 inconsistency between the client and the dropdown.

## Leftovers

- The DCE row's "one job, `list:list` bound to a `list` input" comes from code reading: client value pinned, server `from_json` and meta read. It was not run end to end.
- The branch lacks red tests for the direct-accept rows (`paired_or_unpaired` <- `paired`, `list:paired_or_unpaired` <- `list` / `list:paired`) and for `list` <- `sample_sheet`. They are listed as "still to add".
- The sibling issue number is #TBD in Context.
- Characterization spec (12 cases), for reuse as red tests: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/001ff93d-377b-47f9-82a5-6c4b0bd836d8/scratchpad/DropRows.test.ts`. The scratchpad may vanish. The case list is in the summary above, and the drop harness is `createTarget` + `eventStore.setDragData` + `dragenter` / `drop` from `FormData.test.ts`.

## Recommendation

Post. Every row holds. The client column is now backed by a component run on `dev` code, the server column by code and an existing API test. Post it after the sibling `canMapOver` issue, or together with it, so the #TBD can be filled in.
