# library_collection_selected_history_26.1

Status: `implementing`. Base: `release_26.1` (`d808b6425b8`). Fork: `jmchilton/library_collection_selected_history_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/library_collection_selected_history_26.1`.

Data library Add to History > as a Collection ignored the history picked in "Select history" and built the collection in the current one. Fix plus missing E2E coverage of Add to History > as Datasets. Queued issue: [library_collection_ignores_selected_history](../../../../../agents/gx_issues/to_file/library_collection_ignores_selected_history.md) (not filed).

## Decisions

- Extracted from [galaxy_ui_driver](../galaxy_ui_driver/index.md) `1d227e6fc4c` (fix) and `913dfd7dfd6` (datasets test), at tip `6c434fc3a15`. John asked for `release_26.1`; the bug is also on 25.1 and 26.0.
- `162dfdb49b4` (collection upload hid count) stays on galaxy_ui_driver: its helper isn't on 26.1, and on 26.2/dev the private copy has no collection caller.
- Tests pick the history with `select_by_value` (history id); 26.1 has no `select_by_visible_text`.
