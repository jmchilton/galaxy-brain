# Thermo review: #24288 Add jobs panel to activity bar

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Opus 5.5, effort medium
- Reviewed commit: `f3fd25889b4` (diff base `0de6cc2d7fe`, target `dev`)
- Code not run (profile).

## Verdict

The feature fits well: it mirrors `InvocationScrollList` (ScrollList + GCard + store), reuses `FilterMenu`/`Filtering`, `JobState` and the `total_matches` header convention used by pages/workflows/visualizations, and no file nears 1k lines. The main structural problem is `JobPanel.vue`. It uses the global job **detail** cache (LRU, `MAX_CACHED_JOBS = 40`) to back a paginated list. It then adds about 90 lines of component-local machinery to work around that choice and the client-side hidden-tool filter: `currentJobIds`, the retain map, `serverOffset`, the `totalJobCount` fudge and a store watcher. Two changes would remove most of it: move the list state into its own abstraction, and filter hidden tools on the server. On the backend, `get_count` is now copied a fifth time. The other findings are small.

No P1s. No follow-up refactor issue, because the PR targets `dev` and the refactors fit in this PR.

## P2 1: JobPanel turns the job detail LRU cache into a list store and fights its eviction

`jobStore` was designed as a small LRU cache for detail views. Mounted consumers retain entries, and requests are sequenced so stale responses can't overwrite newer ones. This PR adds `updateJob` and `sortedStoredJobs` so the store can hold list pages. `JobPanel` then has to rebuild list scoping and lifetime on top of that:

- `currentJobIds` scopes the global cache back down to "jobs from this filter".
- `unretainJobById` plus `addCurrentJob`/`stopRetainingCurrentJobs` retain **every** job the panel has ever loaded. While the panel is open, `MAX_CACHED_JOBS` stops limiting anything: scroll 500 jobs and all 500 stay pinned.
- `watch(sortedStoredJobs)` scans the whole store on every change to pick up "new" jobs. It applies ownership (`belongsToAnotherUser`, which needs a `RegisteredUser` cast) and hidden-tool rules again, and only does so when no filter is active. Any job any other component caches (for example a job detail page from a shared history) also gets swept into the panel's unfiltered list if it belongs to the current user.
- `updateJob` writes list snapshots with no request sequencing, unlike `fetchAndCacheJob`'s `isStale` guard. A list page fetched before a poll tick can overwrite a newer polled `state` (bug-adjacent; flag for the bug checker).

The invocation analog keeps this state in its store: `invocationStore` exposes `sortedStoredInvocations`, `totalInvocationCount` and `scrollListScrollTop`, and has no eviction to fight. Either of these would fix it:

- **Preferred:** a small `useJobListStore` (or composable) that owns the list's ids, total and offset, and reads live job objects from `jobStore`. The retain/release logic then lives in one place, scoped to the list, and doesn't leak into the generic cache API.
- **Simpler:** let `ScrollList` own the loaded items (drop `prop-items`), and have `JobCard` overlay live state via `jobStore.getCachedJob(id) ?? item`. That removes `updateJob`, `sortedStoredJobs`, `currentJobIds`, the retain map and the store watcher. Handle "show newly submitted job" with a targeted refresh, for example when the tool form submits or `latestResponse` changes, instead of scanning the whole cache.

Either way, `sortedStoredJobs` copies the existing `sortedStoredInvocations` sort/filter pattern. That is fine, but it shows the list concern belongs next to that store pattern, not inside the component.

## P2 2: Client-side `HIDDEN_TOOL_IDS` filtering breaks ScrollList's offset/total contract

`ScrollList` assumes "rendered items = server offset", and its total count is the server's `total_matches`. Dropping `__DATA_FETCH__`/`upload1` jobs on the client breaks both assumptions. That is why the panel ignores the `_offset` argument, tracks `serverOffset` itself, and replaces `totalJobCount` with `currentSortedJobs.length` once a short page arrives. Three long comments explain the workaround.

The PR already changes `/api/jobs`. Excluding these tools on the server (an `exclude_tool_ids` query param, or a `search` negation term if `parse_filters_structured` can express one) makes the offset and the count correct by construction. `serverOffset`, the count fudge and their comments then disappear, and the loader looks like `loadInvocations`. It would also give other list consumers a server-side way to hide upload jobs.

## P2 3: `get_count` copied a fifth time

`lib/galaxy/managers/jobs.py` adds `get_count(session, statement)`, identical to the copies already in `managers/histories.py`, `managers/pages.py`, `managers/visualizations.py` and `managers/workflows.py`. Hoist one copy into a shared module (for example `galaxy.model.base` or `galaxy.managers.base`) and import it here. Ideally replace the other four too; at minimum don't add a fifth.

There is also a related point. `FastAPIJobs.index` always passes `include_total_count=True`, so every `/api/jobs` call now runs an extra `COUNT(*)` over the filtered subquery. That includes the admin `JobsList` refresh loop, `handlesMappingJobs` and `SelectionField`. This matches the sibling endpoints, but the jobs table is the largest of them. Consider making the count opt-in, either a query flag or only when `limit`/`offset` are given.

## P3 1: Shared `Filtering` behavior change driven by one feature

The `isEqualsKey` change in `utils/filtering.ts` changes case folding for every `*_eq` key in the app. For example, history `name_eq:Select` now sends `Select` instead of `select`, which the updated `HistoryFilters` tests show. It may well be a fix, but it is a change to a shared path that the PR description doesn't mention. Call it out in the PR (or split it into its own commit with a history-filter test). Rename `isEqualsKey` to something like `isExplicitEqSiblingKey`: the doc comment has to explain that it does *not* mean "key with an equals handler".

## P3 2: JobCard re-implements GCard's title and duplicates InvocationScrollList's styles

`InvocationScrollList` uses GCard's `title`, `title-icon`, `title-n-lines="2"` and `title-size` props. `JobCard` instead uses a custom `title` slot with its own `-webkit-line-clamp` CSS and a hand-placed wrench icon. It also copies `.truncate-n-lines.two-lines` and the `faHdd` history-name description block verbatim. Use the GCard props (the state badge can stay in a slot or go through `badges`). Extract the shared "history name" description into a small component, or into GCard's description, so the job and invocation cards don't drift apart.

## P3 3: `JOB_STATES` is a hand-maintained copy of the `JobState` union

`api/jobs.ts` already has `NON_TERMINAL_STATES`/`TERMINAL_STATES`. The new 15-entry `JOB_STATES` array is typed `JobState[]`, so nothing fails if a state is added to the schema. Make it exhaustive at compile time, for example by building it from a `Record<JobState, number>` order map with `satisfies`, or by deriving it from the existing arrays.

## P3 4: ScrollList retry message changed for every consumer

`CLICK_TO_RETRY_MSG` now says "Clear your search or…" for all `ScrollList` users, including ones with no search box (`InvocationScrollList`). Make it a prop, or let the caller supply the error hint.

## P3 5: Unrelated `hasSeenUploadHelp` removal shows up as a rename

In `userStore.ts`, `hasSeenUploadHelp` (unused at base) is deleted in the same hunk that adds `showToolNamesInJobPanel`, so the diff looks like a rename. Fine to drop it, but mention it in the PR or keep it a separate commit.

## Possible bugs noticed (not hunted, for the bug checker)

- **Tool store may be empty.** `jobsFilterParams` name mode (`getToolIdsByName`) and `JobCard`'s `getToolNameById` depend on `toolStore.toolsById` already being populated. `JobPanel` never calls `toolStore.fetchTools()`, while `ToolPanel`, `InteractiveToolsPanel` and `CommandPalette` all do. After a reload with the Jobs panel active, a name search may throw "No tools matched", and titles fall back to ids.
- **No live state for running jobs.** `JobCard` passes `:job` to `JobState`, so `JobState` doesn't poll. Running jobs in the panel only update if something else polls them; the `currentSortedJobs` comment assumes polling "elsewhere".
- **Stale list snapshot can overwrite polled state.** See the `updateJob` sequencing note in P2 1.
