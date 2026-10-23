# Initial review — galaxy#24288 "Add jobs panel to activity bar"

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, effort medium
- Reviewed commit: `f3fd25889b4` (diff vs merge-base `0de6cc2d7fe`, 21 files, +1003/-23)
- Method: code reading only (no client deps / `.venv` in worktree); nothing executed.
- Checked: `JobManager.index_query` / `JobsService.index` now return tuples. Their only callers (`services/jobs.py`, `api/jobs.py`) are updated, and `git grep` over `lib` and `test` found no others.

## Verdict

Request changes (small). Shape is good and mirrors the Invocations panel (`ScrollList` + store-backed `prop-items`, `GCard`, `total_matches` header following the histories pattern). Four real issues in `JobPanel`/`JobCard`, none large: running jobs are never refreshed, filter state can mix across filters, name mode builds unbounded `tool_id` lists, and the tool-name fallback is dead so cards show `...`. The rest are reuse and scope nits.

## Bugs

### P2 1: Non-terminal jobs in the panel never update

`JobCard` passes `:job="props.job"` to `JobState`, which then skips `useJobDetails` (`JobState.vue:35-37`: it fetches/polls only when `job === undefined`). `JobPanel` never polls either. A job listed as `queued`/`running` stays that way until the panel remounts or the filter changes. The comment on `currentSortedJobs` ("kept up to date reactively as the store updates (e.g. job state changes polled elsewhere)") only holds if some other view happens to poll that job. Watching job state is the main reason to open a Jobs panel, so this matters more here than for the Invocations panel. `InvocationScrollList` also only takes list snapshots, but invocation states change less often.

What does work: a job that was just submitted from the tool form is polled by `ToolSuccess` (`useJobDetails`), so its card updates through the shared store. The gap is every job nobody else is viewing, such as jobs from workflows, other tabs, or jobs submitted before the panel opened.

The Selenium test waits for `wait_for_history(..., assert_ok=True)` before opening the panel, so it can't catch this.

Suggested fix: for jobs in `currentSortedJobs` in `NON_TERMINAL_STATES`, call `jobStore.pollJobUntilTerminal({ id, full: false })` and release the handle on filter change or unmount, alongside the existing `retainJob` bookkeeping. Another option is a periodic re-fetch of the first page. Add a vitest case: mount with a `running` job, have the mock return `ok` on `/api/jobs/{id}`, and assert that the badge flips.

### P2 2: Filter-scoped panel state isn't tied to the request or mode that produced it

`serverOffset`, `currentJobIds` and `totalJobCount` are panel-level refs that `watch(filterKey)` resets. Two ways they go wrong:

- **Name/ID toggle doesn't reset.** `filterKey` is only `filterText.trim()`, so flipping the "Tool Names" switch with text in the box keeps the ID-mode results on screen. The next scroll page is then fetched in name mode at the ID-mode `serverOffset`.
- **In-flight load lands after a filter change.** `loadJobs` reads `filterText` before the `await` but mutates `serverOffset`/`currentJobIds` after it. If the user types while a page is loading (likely with `FilterMenu`'s debounce and a slow `/api/jobs`), the old response adds old-filter jobs to the new `currentJobIds` and advances the new `serverOffset`. `currentSortedJobs` is the new `ScrollList`'s `prop-items`, so the stale jobs render under the new filter.

Suggested fix: include the name-mode flag in `filterKey` (e.g. `` `${showToolNamesInJobPanel}:${filterText.trim()}` ``). Capture the key or a generation counter at the start of `loadJobs` and drop the result if it changed by the time the fetch resolves. Unit test: toggle name mode with text present and assert a refetch with `tool_id` params.

### P2 3: Name-mode search sends every matching tool id in the query string

`jobsFilterParams(..., true)` resolves `name` with a case-insensitive substring match over all of `toolsById` (`getToolIdsByName`) and sends the result as `tool_id=...&tool_id=...`. On a large server (thousands of tools, toolshed GUIDs of about 80 characters), a short query like `a` or `cut` can match hundreds or thousands of ids. That exceeds proxy/URL limits (414) or builds a huge `IN (...)`. Two smaller problems follow from the same design:

- Jobs from tools that are no longer installed can't be found by name.
- The tool store may not be loaded at all (see P2 4), and then every query throws "No tools matched".

Suggested fix: cap the match count and fall back to an error such as "too many tools match, refine your search". A better fix is server-side name search. `tool_ids_like`/`search` already exist on `/api/jobs`, and adding a tool-name term would need the toolbox, so at minimum cap it and document the limitation.

### P2 4: `JobCard` tool-name fallback is dead; titles show `...` (and name search fails) when tools aren't loaded

```ts
return toolStore.getToolNameById(props.job.tool_id) || props.job.tool_id;
```

`getToolNameById(toolId, defaultValue = "...")` returns the truthy `"..."` for unknown ids, so `|| props.job.tool_id` never applies. Uninstalled tools, and every card when `toolsById` is empty, render as `...`. `JobPanel` never calls `toolStore.fetchTools()`. The tool store is populated only by `ToolPanel`, `InteractiveToolsPanel`, `ToolsList`, the command palette and upload's data-source list (grep of `fetchTools(` in `client/src`). So if the Jobs activity is active after a reload, name mode is broken until the user opens the tool panel.

Suggested fix: `getToolNameById(props.job.tool_id, props.job.tool_id)`. Have `JobPanel` call `toolStore.fetchTools()` on mount when name mode is on (or when it toggles on), as `InteractiveToolsPanel.vue:43` does. Add a `JobPanel`/`JobCard` test for an unknown tool id in name mode.

## Should-fix / reuse

### P3 1: `updateJob` bypasses the store's stale-response guard

`jobStore.updateJob` merges list snapshots without consulting `appliedSequenceByJobId`. If a `/api/jobs` page request starts before a `/api/jobs/{id}` poll that resolves to `ok`, and the page response lands after that poll, the list's `running` snapshot overwrites `ok`. Once the poll has ended, `JobInformation` and the panel both show `running`. The window is narrow, but the store went to some trouble to prevent exactly this. Suggest skipping the merge when the cached `update_time` is newer than the incoming one.

### P3 2: Sixth copy of `get_count` in `lib/galaxy/managers`

`jobs.py` adds `def get_count(session, statement)`, which is byte-identical to the copies in `folders.py`, `histories.py`, `pages.py`, `visualizations.py` and `workflows.py`. Suggest promoting one copy to a shared module (e.g. `galaxy.model.base` or `galaxy.managers.base`) and importing it here, rather than accreting a sixth.

### P3 3: Count query on every `/api/jobs` call, untested

`FastAPIJobs.index` always passes `include_total_count=True`, so every caller pays an extra `COUNT(*)` over the filtered subquery. That includes the admin job list's frequent refresh (default limit 500), `SelectionField`, and `handlesMappingJobs`. This matches the histories endpoint, so it's acceptable, but no API test asserts the new `total_matches` header. Add a header assertion to an existing `test_jobs.py` index test.

### P3 4: Shared-utility behavior changes ride along unannounced

- `Filtering.isEqualsKey` now preserves case for every unquoted `*_eq` key, which also covers `HistoryFilters` `name_eq`/`genome_build_eq`. This is arguably a fix, because backend `name-eq` is exact and previously got the lower-cased value. Existing `filtering.test.js` expectations were changed to match. Worth a sentence in the PR description, since it changes history filtering.
- `ScrollList`'s `CLICK_TO_RETRY_MSG` now says "Clear your search…" for every consumer, including ones with no search box (`InvocationScrollList`, `HistoryGraphPanel`, ...). Consider making the message a prop or keeping the generic text.
- `userStore.hasSeenUploadHelp` is removed. It is already unused on `dev` (left over from `f40b8e38945` "Remove legacy upload modal"), so the removal is harmless, but it's unrelated to this PR.

### P3 5: Filter vocabulary diverges from the admin Jobs list

The admin `JobsList.vue` uses filter keys that match the backend search grammar (`tool:`, `user:`, `runner:`, `handler:`) and passes the text straight through as `search`. The panel uses `tool_id:`/`tool_id_eq:` and rebuilds a `tool:` term client-side. The same concept now has two spellings in the UI. Consider either reusing `tool:` as the key (and sharing a `JobsFilters` base with the admin list) or noting why the panel diverges.

### P3 6: Hidden-tool exclusion done client-side forces offset bookkeeping

`HIDDEN_TOOL_IDS` (`__DATA_FETCH__`, `upload1`) are dropped after each fetch. As a result `JobPanel` keeps its own `serverOffset` and rewrites `totalJobCount`, working around the mismatch between the API's `total_matches` and the cards it renders. For upload-heavy users, whole pages render no new cards; `ScrollList` keeps chaining loads until it fills. A server-side exclusion would remove both workarounds and keep `total_matches` honest. For example, an `exclude_tool_ids` or `tool_ids_not` param on `/api/jobs`, sitting next to the existing `tool_ids`/`tool_ids_like` in `JobManager.index_query`. Not blocking.

### P3 7: `JobCard` re-implements `GCard`'s title features

`InvocationScrollList` uses `GCard`'s `:title`, `:title-icon`, `:title-n-lines="2"` and `title-size` props. `JobCard` overrides the `title` slot to rebuild the icon and the 2-line clamp, and copies `.truncate-n-lines` SCSS from `InvocationScrollList`. `GCard` already has a `titleBadges` slot, which suits `JobState` (it needs a slot rather than the `badges` prop because of its stop button). Using the props plus that slot drops most of `JobCard`'s template and style.

## Nits

- `faTrain` icon and the description "Displays all job runs." / tooltip "Show all job runs" don't say the list is scoped to your jobs.
- `services/jobs.py` `index` now returns a dict list, which forces a `# type: ignore[return-value]` in the API. Fine as a match for neighbours, but a typed list model would drop the ignore.
- The `JobPanel.test.ts` comment "shows a job with no owner information (the common, non-admin case)" is inaccurate. `/api/jobs/{id}` (element view) includes `user_id` for everyone, so owner-less store entries come only from list responses, which are already filtered by `user_id`.
- `JobsFilters.test.ts` "search by name mode" calls `setActivePinia` and seeds `saveAllTools` at `describe` time rather than in a `beforeEach`. It works, but it relies on collection order.

## Tests

The coverage is reasonable: filter param unit tests, `JobPanel` store-sync and eviction-retention tests, and 3 Selenium tests (appears, filter by id, invalid key). Gaps that line up with the bugs above:

- No test of state updates for a non-terminal job (P2 1).
- No test for the name-mode toggle (P2 2).
- No test for a tool missing from the store (P2 4).
- No API assertion on `total_matches` (P3 3).

No existing tests were weakened. The `filtering.test.js` edits track an intentional behavior change (P3 4).
