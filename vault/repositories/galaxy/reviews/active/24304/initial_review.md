# Initial review — #24304

- Profile: `default`
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `4471d665921a87dd5b68e3911025e9d55ede757c` (diff vs `origin/release_26.2`)
- Scope: `client/src/components/SelectionDialog/HistoryDatasetPicker.vue`, new `HistoryDatasetPicker.test.ts`

## Summary

Small, well-targeted fix. The picker built its own `/api/histories` query, sending `search` only when the user had typed a filter. Without `search`, the backend `index` takes the legacy `service.index` path, which ignores `show_*`, `sort_by`/`sort_desc` and doesn't set `total_matches`. With `search`, `index_query` applies the backend default `show_published=true` because the picker never sent `show_published=false`. Switching to the existing `getMyHistories()` helper fixes both: the helper always sends `search` (defaults to `""`) and explicit visibility flags (own only, no published, shared, or archived). This reuses the abstraction `HistoryList.vue` already uses. Good outcome, nothing new accreted.

Checked and fine:

- **Dropping `q`/`qv` from `HistoriesFilters.getQueryDict` is behavior-preserving.** When `search` is present, the API (`lib/galaxy/webapps/galaxy/api/histories.py` `index`) builds `HistoryIndexQueryPayload` without the filter query params, so `q`/`qv` were already ignored on every filtered request. The raw filter text still goes through `search` and gets parsed by `INDEX_SEARCH_FILTERS` (name/user/tag/is).
- **Error handling holds.** The helper `rethrowSimple`s, and the existing `catch` turns that into `errorMessage`, as the removed `if (error)` branch did.
- **Types line up.** `MyHistory` is `HistorySummary & { username }`, so `historyEntryToRecord` accepts it. The `keys` change from `create_time` to `username` is fine because `create_time` was never read.
- **The default sort `ctx.sortDesc ?? true` only applies before any header click.** `SelectionDialog` starts `sortDesc` as `undefined`, so newest-first is the initial order. A header click passes an explicit boolean through.
- **The imports are still needed.** `GalaxyApi` is used by `datasetsProvider` and `HistoriesFilters` by the template.
- **No sibling callers have the same bug.** The other `/api/histories` GETs in the client (`DatasetCopy.vue`, the disk usage service, `getBeaconHistories`) don't go through the `search` path.

Test: a single vitest that mounts the picker, intercepts `/api/histories`, and checks the query and the rendered row. Ran it under node 22.20.0: it passes at the PR head, and fails against the base `HistoryDatasetPicker.vue` because `search`, `show_published` and `sort_desc` are missing (red-to-green confirmed). `src/api/histories.test.ts` also passes. It works at the right layer: it asserts on the outgoing request, not on internals.

## Findings

### P3 1: Redundant `?? ""` and comment duplicate the helper's contract

`getHistories` already defaults `search = ""` and always sends it. Passing `search: filter` (or `ctx.filter`) gives the same request, so `?? ""` is a no-op. The two-line comment above the call describes a backend quirk the helper exists to hide. If the note is worth keeping, it belongs on `getHistories`'s docstring next to the existing visibility-flag note, where every caller benefits. Otherwise drop both. Minor; fine to leave as is.

## Non-findings / out of scope

- `HistoriesFilters` advertises `annotation:` and `update_time` filters, but the backend `search` grammar (`INDEX_SEARCH_FILTERS`) doesn't support them, so they are silently ignored. This predates the PR and was equally broken before, because `q`/`qv` were dropped on the `search` path.
- Pinning the current history and adding a public-histories toggle are explicitly out of scope in the PR description. Not raised.
