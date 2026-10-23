### P2 1: Queued and running jobs in the panel never update (implementation verified)

`JobCard` passes the list row to `JobState` as `:job`. When `job` is set, `JobState` skips `useJobDetails`, which is what would poll it, and `JobPanel` doesn't poll either. A card that loads as `queued`, `running` or `finishing` keeps that state until the panel remounts, unless some other view (such as `ToolSuccess` for a job just submitted) happens to be polling the same job. Watching job state is a main reason to open this panel, and that is the case where it fails: workflow jobs, jobs from other tabs, and anything submitted before the panel opened.

For jobs that are neither terminal nor paused, have `JobCard` pass `undefined` to `JobState`. `JobState` then retains the job and polls it through `useJobDetails`, reading the same `jobStore` entry. Once the job is terminal, the list row updates and polling stops. Commit `32448322399` does this, using the same `TERMINAL_STATES` stop condition as `JobState`. `NON_TERMINAL_STATES` would miss `finishing`. Paused jobs are left out because they can wait indefinitely. Polling uses `pollJobUntilTerminal`'s fixed 1s interval, so each active card that has loaded adds one request per second. A periodic refetch of the first page would cost less if many running jobs are a concern.

<details><summary>Evidence</summary>

New `JobPanel.test.ts` cases list a `running` job and a `finishing` job, serve `ok` from `/api/jobs/{id}`, and assert that the badge flips. The `running` case fails at the reviewed commit. The `finishing` case also fails under a `NON_TERMINAL_STATES` condition.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: Name mode depends on a tool store nothing loads, and the title fallback is dead (implementation verified)

Name search (`getToolIdsByName`) and name titles both read `toolStore.toolsById`, but neither `JobPanel` nor `JobCard` calls `fetchTools()`. Other panels populate the store: the Tool panel, Interactive Tools, the command palette and similar. So whether name mode works depends on what the user opened earlier. With an empty store, every name search throws "No tools matched the provided name". Separately, `getToolNameById(id)` defaults to the truthy `"..."`, so `|| props.job.tool_id` never applies. Cards for uninstalled tools, or every card when the store is empty, render as `...`.

Load tools in the panel, and pass the id as the default. Commit `e021207f4ef` makes `loadJobs` await a deduped `toolStore.fetchTools()` in name mode, so a search can't run before tools load. A watcher on the toggle loads tools for titles, and the title uses `getToolNameById(tool_id, tool_id)`.

<details><summary>Details</summary>

The commit also adds `test_search_jobs_by_tool_name` to `test_job_panel.py`, which is the first use of the `name_mode_toggle` selector. It toggles name mode, asserts the cat1 title is "Concatenate multiple datasets or collections", searches `'Select random lines'`, and asserts only the random_lines1 card remains. It passes under the Playwright backend. It is not a red test for the loading bug: locally it also passed with the loading removed, because the default tool panel had already filled the store. The vitest below covers that.

</details>

<details><summary>Evidence</summary>

A new `JobPanel.test.ts` case starts with an empty tool store in name mode. It asserts that the request carries `tool_id=cat1`, that the card is titled by name, and that an unknown tool's card shows its id. It fails before the change.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 3: Panel state isn't tied to the filter or mode that produced it (implementation verified)

`serverOffset`, `currentJobIds` and `totalJobCount` are reset by `watch(filterKey)`, but `filterKey` is only the trimmed text. That causes two problems:

- **The name/ID toggle doesn't reset the list.** Flipping "Tool Names" with text in the box keeps the ID-mode results on screen. The next page is then fetched in name mode at the ID-mode offset.
- **A page in flight can land in the new list.** `loadJobs` mutates panel state after its `await`. A page requested under the old filter that resolves after the filter changes adds old-filter jobs to the new list and advances the new offset.

Put the mode in `filterKey` when text is present. Bump a generation counter on every filter change, capture it at the start of `loadJobs`, and drop the response if it changed. Comparing keys alone would let a page from the first `A` list land in the second when the user types A→B→A. Commit `b02cb7b7853` does both.

<details><summary>Evidence</summary>

Two new `JobPanel.test.ts` cases both fail before the change. One toggles name mode with text present and expects a refetch with `tool_id`. The other holds a page until after the filter changes and expects its job not to render.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 4: Name search can send an unbounded `tool_id` list (implementation verified)

Name mode turns the query into every tool id whose name contains it and sends them as repeated `tool_id=` params. On a large server, a short query such as `a` or `cut` matches hundreds or thousands of ids, many of them ~80-character toolshed GUIDs. That can exceed proxy URL limits (414) or build a very large `IN (...)`.

Cap the match count and ask the user to refine. Commit `8479780ae31` throws "N tools matched the provided name: X. Please refine your search." past `MAX_TOOL_NAME_MATCHES` (50), and the panel shows it like other filter errors. A server-side tool-name search would remove the limit, but it needs the toolbox in the jobs query.

<details><summary>Evidence</summary>

A new `JobsFilters.test.ts` case seeds 51 matching tools and asserts the error. An exact match still returns one id.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 5: `JobPanel` uses the job detail LRU cache as a list store

`jobStore` is a small LRU cache (`MAX_CACHED_JOBS = 40`) built for detail views. This PR adds `updateJob` and `sortedStoredJobs`, so the store also holds list pages. `JobPanel` then adds about 90 lines of component-local machinery to work around that:

- `currentJobIds` scopes the global cache back down to the current filter.
- A retain map pins every job the panel has loaded, so while the panel is open, `MAX_CACHED_JOBS` stops limiting anything.
- `watch(sortedStoredJobs)` scans the whole cache on every change and re-applies the ownership and hidden-tool rules. A job that another component cached also appears in the unfiltered list if it belongs to the user.

`invocationStore` keeps the analogous state (`sortedStoredInvocations`, `totalInvocationCount`) in the store, with no eviction to fight.

Move the list's ids, total and offset into a small `useJobListStore` or composable that reads live jobs from `jobStore`. A simpler route: let `ScrollList` own the loaded items and have `JobCard` overlay live state with `jobStore.getCachedJob(id) ?? item`. Then `updateJob`, `sortedStoredJobs`, `currentJobIds`, the retain map and the store watcher all go away, and newly submitted jobs come from a targeted refresh. Not done on the review branch: either route redesigns how the panel gets new jobs, which is the author's call.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort.

</details>

### P2 6: No API test for the new `total_matches` header (implementation verified)

`GET /api/jobs` now always returns a `total_matches` header, and the panel relies on it to stop paging (`fetchJobs` falls back to `0` when the header is missing). No API test asserts the header.

This was raised as P1 and is lowered to P2 here, because nothing is broken and the header follows the convention histories, pages and workflows already use. Commit `c7ff75f9cd1` adds `TestJobsApi.test_index_total_matches`, modeled on `test_workflows.py::test_index_total_matches`. It creates three jobs in a new history and asserts that `limit=1` and `limit=1&offset=2` both report 3 while returning one row. It also asserts that a non-matching `search` reports 0.

The count itself is not opt-in: every `/api/jobs` call, including the admin `JobsList` refresh at limit 500, now runs an extra `COUNT(*)`. Pages and workflows do the same, but histories counts only on its query path. Making it opt-in is worth considering for large servers. The review branch leaves it unchanged.

<details><summary>Evidence</summary>

The test passes against the review branch, so it also covers the shared `get_count` helper (P3 2).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `updateJob` bypasses the store's stale-response guard (implementation verified)

`fetchAndCacheJob` sequences requests so that an older response can't overwrite a newer one, but `updateJob` merges list rows unconditionally. Suppose a `/api/jobs` page starts before a `/api/jobs/{id}` poll that returns `ok`, and the page lands afterwards. The page's `running` row then overwrites `ok`, and after the poll ends both the panel and `JobInformation` show `running`.

Commit `fcf47f1af02` compares `update_time`. An older row only fills in fields the cache lacks, the same way a stale `fetchAndCacheJob` response is handled.

<details><summary>Evidence</summary>

A new `jobStore.test.ts` case fetches `ok`, merges an older `running` row, and expects `ok`. It fails before the change.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Sixth identical copy of `get_count` in `managers/` (implementation verified)

`managers/jobs.py` adds `get_count(session, statement)`, byte-identical to the copies in `folders.py`, `histories.py`, `pages.py`, `visualizations.py` and `workflows.py`.

Commit `87adfabd7fc` moves one typed copy to `galaxy.managers.base`, imports it in all six modules, and drops the now-unused `func` imports. It goes beyond "don't add a sixth" so that only one copy is left. If the author would rather keep the diff to jobs only, use the shared helper there and leave the other five.

<details><summary>Evidence</summary>

All six modules import cleanly, ruff, black and isort pass, and `test_index_total_matches` passes through the shared helper.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Shared-utility changes ride along unannounced (implementation verified)

- **`Filtering.isEqualsKey`** now keeps the case of unquoted values for every declared `*_eq` key, not only the jobs keys. For example, history `name_eq:Select` now sends `Select` instead of `select`. This is probably a fix, since backend `eq` is case-sensitive, and the `filtering.test.js` expectations were updated to match. It still changes the history filters, so mention it in the PR description. The name also reads as "key with an equals handler", which the doc comment has to correct; something like `isExplicitEqSiblingKey` would say what it means.
- **`ScrollList`'s retry message** changed to "Clear your search or…" for every consumer, including lists with no search box (`InvocationScrollList`, `HistoryGraphPanel`). Commit `3cf34049083` adds a `retryMessage` prop with the old generic default, and `JobPanel` passes the search wording.
- **`userStore.hasSeenUploadHelp`** is removed in the same hunk that adds `showToolNamesInJobPanel`, so the diff reads as a rename. It was already unused on `dev`, so removing it is harmless, but mention it in the PR description.

<details><summary>Evidence</summary>

A new `JobPanel.test.ts` case asserts that the invalid-filter alert carries the error and the clear-search hint. `ScrollList.test.ts` still passes with the generic default.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Hidden upload tools are filtered on the client, which forces offset bookkeeping

`HIDDEN_TOOL_IDS` (`__DATA_FETCH__`, `upload1`) are dropped after each fetch. That breaks `ScrollList`'s assumption that rendered items equal the server offset and that the total equals `total_matches`. To compensate, `JobPanel` tracks its own `serverOffset`, replaces the total with the rendered count after a short page, and needs three long comments to explain it. For users with many uploads, whole pages add no cards, and `ScrollList` keeps requesting more.

The PR already changes `/api/jobs`. Excluding these tools on the server would make the offset and count correct by construction. It could be an `exclude_tool_ids` param next to `tool_ids`/`tool_ids_like` in `JobManager.index_query`, or a negated `search` term. The loader would then look like `loadInvocations`. Not done on the review branch, because it adds public API surface (plus a schema regen) that maintainers should agree on.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>

### P3 5: `JobCard` re-implements `GCard`'s title (implementation verified)

`InvocationScrollList` uses `GCard`'s `title`, `title-icon`, `title-n-lines` and `title-size` props. `JobCard` instead overrides the `title` slot and rebuilds the icon and the two-line clamp in its own CSS.

Commit `f9a55db681e` switches to those props and puts `JobState` in the `titleBadges` slot, as both reviews suggested. As a result, the state badge sits under the title instead of to its right. The title selector in `navigation.yml` and the vitest now use `GCard`'s title id. The history-name description block is still copied from `InvocationScrollList`, and a small shared component would keep the two cards from drifting apart.

<details><summary>Evidence</summary>

The `JobPanel` vitest suite and all four `test_job_panel.py` Selenium tests pass with the new title markup (Playwright backend).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 6: `JOB_STATES` is a hand-kept copy of the `JobState` union, and it is already missing `finishing` (implementation verified)

The new `JOB_STATES: JobState[]` lists 15 states. The schema's `JobState` has 16: `finishing` is missing, so the state filter dropdown can't offer it. With the `JobState[]` type, nothing fails when a state is missing or added.

Commit `a7e3ebe6e9b` builds the list from a `{ ... } satisfies Record<JobState, true>` object in display order. Typecheck now fails when the schema gains or loses a state, and the commit adds `finishing`.

<details><summary>Evidence</summary>

Compared against the generated schema, and `vue-tsc --noEmit` passes.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 7: Filter vocabulary diverges from the admin Jobs list

The admin `JobsList.vue` uses keys from the backend search grammar (`tool:`, `user:`, `runner:`, `handler:`) and passes the text through as `search`. The panel uses `tool_id:`/`tool_id_eq:` and rebuilds a `tool:` term on the client, so the same concept now has two spellings in the UI. Either reuse `tool:` and share a jobs filter base with the admin list, or say why the panel diverges.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>

### P3 8: The invalid-filter Selenium test asserts only absence (implementation verified)

`test_filter_by_invalid_filter_key_shows_an_error_instead_of_the_unfiltered_list` checks only that the card disappears, which also passes if the list is blank for any reason.

Commit `8f30600b41c` adds a `job_panel.error_alert` selector and asserts that the alert contains `Invalid filter(s) in query: xx`.

<details><summary>Evidence</summary>

Passes under the Playwright backend. The Selenium backend wasn't run locally.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 9: Test setup hygiene (implementation verified)

- `JobsFilters.test.ts` creates Pinia and seeds tools in the `describe("search by name mode")` body at collection time. `client/README.md` recommends `beforeEach`.
- `"combines a name filter with state"` asserts unsorted tool ids, while the sibling tests sort them.
- The `JobPanel` scroll-cap test builds `update_time` as `00:<index>:00`, which stops being a valid time once an index reaches 60. It also asserts only the count, so the descending sort in `sortedStoredJobs` goes untested.

Commit `021519629fe` moves the seeding into `beforeEach`, sorts the ids, and derives times from a `Date`. It also asserts that the first and last cards are the newest and the oldest.

<details><summary>Evidence</summary>

`JobsFilters.test.ts` and `JobPanel.test.ts` pass.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 10: The `toolStore.test.ts` `getToolIdsByName` test duplicates the JobsFilters name-mode tests

It uses the same fixture and the same cases (partial match, exact case-insensitive match) as the JobsFilters name-mode tests, which already exercise the getter through its only caller. Consider dropping it. The review branch leaves it in place.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort.

</details>
