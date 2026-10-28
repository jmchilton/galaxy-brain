# Paged tool data options: a collection's map-over option can be split off / dropped and become unloadable

Raw agent draft (found + fixed on branch `issue_20657_input_processing_mode`, 2026-10-17). Polish per PREPARE_TO_FILE.md. Backport target: **release_26.1** (paging introduced there).

## Bug

Collection inputs list each HDCA as up to two options: direct, plus map-over (`map_over_type`, from `_classify_hdca` / `make_hdca_entry`). Options are paged server-side via `accumulate_with_filter` (`lib/galaxy/tools/parameters/pagination.py`) and merged client-side on "load more".

Two defects combine:
1. **Server**: `accumulate_with_filter` breaks mid-row when `len(matches) >= limit`, so an HDCA's direct entry can end one page and its map-over entry belongs to the next. `has_more` counts consumed *rows*; if that HDCA was the last row, `has_more` is false → the map-over entry is never offered for loading.
2. **Client**: page merges (`ToolForm.vue` `mergeFetchedOptions`, `Workflow/Run/WorkflowRunDefaultStep.vue`) dedupe by `id`+`src`, so even when the next page arrives, the map-over entry for an already-listed HDCA is dropped.

Result: user can't select "map over" for some collections (e.g. a `list:list` on a `list` input) depending on history position / page size. Silent.

## Fix (already on feature branch — preferred approach)

Commits on `jmchilton/issue_20657_input_processing_mode`:
- `76750495c46` Baseline tests for option paging (unit `test/unit/app/tools/test_parameter_pagination.py`, API `lib/galaxy_test/api/test_tools.py` with `limit: 1` — pins the split as on dev).
- `05907884de9` Share data option lookup and page-merge helpers (`mergeDataOptions`/`findDataOption`/`isSameItem` in `FormData/types.ts`; ToolForm + WorkflowRunDefaultStep use it — refactor, same identity).
- `826a64a9784` Keep map-over options split across option pages (`mergeDataOptions` keys on `map_over_type`; ToolForm.test.ts).
- `562ce4f58fa` Keep a collection's direct and map-over options on one page (server: finish the row even past `limit`; baseline API test renamed `..._keeps_direct_and_multirun_entries_together`).

Server + client halves both needed (offset landing mid-row still possible for old clients/odd offsets).

## Affected versions

Pagination exists on release_26.1, release_26.2, dev. Not 26.0 or older (no paging).

## Test plan

Unit: `accumulate_with_filter` with a list-returning filter, limit landing mid-row → page includes whole row, `has_more` correct. API: two collections, `limit: 1`, collection input that lists both direct + map-over → both entries on same page. vitest: merging a page with the map-over entry of an already-present item keeps both.

## Related

- `tool_form_offpage_collection_selection_lost_on_refresh.md` (sibling paging bug, not fixed on branch). #19234/#20657 feature branch record: vault/repositories/galaxy/branches/active/issue_20657_input_processing_mode/.
