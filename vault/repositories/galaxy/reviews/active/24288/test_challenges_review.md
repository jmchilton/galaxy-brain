# Test challenges review — PR #24288

Profile: gx_test_challenger. Model: Opus 5.5, effort medium. Reviewed commit: `f3fd25889b4` (base `0de6cc2d7fe`). Code reasoning only; nothing run. Full plan: [test_challenges_debrief.md](test_challenges_debrief.md).

Verdict: Selenium coverage is a good start and the vitest filter tests are contract-level. Main gaps: backend `total_matches` header has no API test, and tool-name mode has no E2E coverage despite a likely tool-store loading hole.

## P1 1: No API test for the new `total_matches` header on `GET /api/jobs`

`managers/jobs.py`, `services/jobs.py`, `api/jobs.py` add a count query and header. The Jobs panel relies on it to stop paging (`fetchJobs` falls back to `"0"` if missing). Add `test_index_total_matches` to `lib/galaxy_test/api/test_jobs.py`, mirroring `test_workflows.py::test_index_total_matches`: create 3 jobs in a new history, assert `limit=1` returns 1 item with `total_matches == "3"`, `offset=2` keeps `"3"`, and a non-matching `search` gives `"0"`. Fails today's base at the header assertion. Add a header-returning variant of the `__jobs_index` helper rather than repeating `self._get("jobs", ...)`.

## P2 1: Tool-name mode untested end to end; tool store may not be loaded

`job_panel.name_mode_toggle` is added to `navigation.yml` but unused. Name mode resolves names through `useToolStore().getToolIdsByName`, yet neither `JobPanel.vue` nor `JobCard.vue` calls `toolStore.fetchTools()`. Suspected bug (unverified): if the Jobs panel is open without ToolPanel ever having mounted (e.g. after reload), name searches throw "No tools matched the provided name" and titles fall back to ids. Add a Selenium test: run `cat1` + `random_lines1`, open Jobs panel after reload, toggle name mode, assert cat1 card title is "Concatenate multiple datasets or collections", search `'Select random lines'`, assert only the random_lines1 card remains.

## P2 2: Invalid-filter Selenium test asserts only absence

`test_filter_by_invalid_filter_key_shows_an_error_instead_of_the_unfiltered_list` checks the card disappears, which also passes if the list is blank for any reason. Assert the panel's danger alert contains `Invalid filter(s) in query: xx` (new selector, e.g. `error_alert: '[data-description="Jobs"] .alert-danger'`).

## P3 1: Drop redundant `toolStore.test.ts` `getToolIdsByName` test

Same fixture and cases (partial, exact case-insensitive) as the JobsFilters name-mode tests, which cover the getter through its only caller.

## P3 2: JobsFilters.test.ts setup hygiene

`describe("search by name mode")` creates Pinia and seeds tools in the describe body at collection time; move to `beforeEach` per `client/README.md`. `"combines a name filter with state"` asserts unsorted tool ids while sibling tests sort; sort for consistency.

## P3 3: JobPanel scroll-cap test timestamps

`update_time` is built as `00:<index>:00`; valid only while indexes stay below 60 (`MAX_CACHED_JOBS = 40` + 20). Derive from a `Date` and optionally assert card order to cover the otherwise untested `sortedStoredJobs` sort.

## Notes (not findings)

- `isEqualsKey` in `filtering.ts` also changes History panel `name_eq`/`genome_build_eq`: unquoted values are now sent case-preserved to the case-sensitive backend `eq`. Tests were updated to match; looks intentional, but worth calling out in the PR description.
- `get_count` in `managers/jobs.py` is the 6th identical copy across `managers/`; a shared helper would be better.
- Kept as-is: JobPanel ownership/auto-admit unit tests (hard to reach in E2E), jobStore `updateJob` eviction test.
