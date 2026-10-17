# Implementation debrief

**STATUS: READY.** Base `release_26.1` (`dbe4f2f7e41`). Head `79dccaf6f84`, pushed to `jmchilton`. Scope: re-scoped once (expand). The second scope evaluation says keep.

## Commits

1. `4df74333a48` **Baseline tests for option paging.** Pins three things:
   - `accumulate_with_filter` paging;
   - the old split of a list:list's direct and map-over entries across pages;
   - a list:list run through `collection_list_or_nested_list_input`, directly and mapped over (`test_tool_execute.py`).

   Also adds FormData cases (a value without `map_over_type` resolves to the direct row; collections on a dataset input get no suffix). All of it passes on base.
2. `27506823dcb` **Lookup helpers, no behavior change.** Adds `isSameItem` and `findDataOption` (id+src) and uses them in FormData's `currentValue`/`matchedValues`. Keep-cache keys go through `itemUniqueKey`.
3. `599d0978a83` **Server.** `accumulate_with_filter` finishes the row it is on, so a page can hold `limit + 1` entries. Without this, `has_more` (which counts rows) hides a split-off map-over entry.
4. `4249dbb60ba` **Client merge.** Adds `mergeDataOptions`, used by `ToolForm.vue` and `WorkflowRunDefaultStep.vue`, keyed on src+id+`map_over_type`. Before, the workflow run form dropped the second entry even when both arrived on the same page.
5. `79dccaf6f84` **Map-over row selectable (re-scope).**
   - `itemUniqueKey` includes `map_over_type`.
   - `findDataOption` tries the exact key first, then the same item.
   - FormData's keep-replace, `createValue` dedupe, `normalizeOption` (now shared by `handleIncoming`) and the drag-enter duplicate check use the helpers.
   - On collection inputs, map-over options get the label ` (one job per <unit>)`. The unit comes from `collectionTypeToText`, with `single_datasets` shown as "dataset".

## Choices

- Hand-ported the client half instead of cherry-picking. Dev's ToolForm is `<script setup>`, and dev's badge relies on a FormSelect `label-area` slot that 26.1 doesn't have, so 26.1 gets a text suffix instead.
- Re-scope: a probe showed that on 26.1 the map-over row shared its key and label with the direct row, so it could not be picked even on page one. Delivering it across pages alone would have added a duplicate row that does nothing.
- Kept out of scope:
  - `/build` echoing `map_over_type` in `value`: server-seeded values (first load, rerun) still resolve to the direct row. This belongs to the #24219 family.
  - Drop-path map-over matching (#24220).
  - Shared `mergeFetchedOptions` and the WorkflowRun merge refactors (dev).
- Test challenges:
  - Round 1 dropped one unit test that duplicated the API test.
  - Round 2 swapped `types.test.ts` for tests at the merge call sites: ToolForm, and a new `WorkflowRunDefaultStep.test.js`.
  - Round 2 also added the execute API test.

## Verification

- Unit `test_parameter_pagination.py`: 2/2.
- vitest Form/Tool/Workflow/Run: 295/295 (node 22.20.0). vue-tsc: clean.
- API: `test_build_collection_options or test_build_data_options or pagination` 13/13, plus the new execute test.
- Red checks: every new test fails without its fix commit. The new API paging test fails on the old server.
- Codex round 2: no findings. Screenshots: before/after for Extract dataset and the list:list tool ([screenshot_debrief.md](screenshot_debrief.md)).
- Fork CI: not run yet.

## PR notes

- Known gaps:
  - Server-seeded values resolve to the direct row.
  - Client search matches the suffix text.
- Decompositions are in [scope_evaluation.md](scope_evaluation.md). One PR is fine (+343/-64, ~237 of it tests).
- If this lands first, drop the matching commits from `issue_20657_input_processing_mode`.
