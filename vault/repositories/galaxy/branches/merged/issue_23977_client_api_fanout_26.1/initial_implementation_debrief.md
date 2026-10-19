# Initial implementation debrief: issue_23977_client_api_fanout_26.1

Branch `issue_23977_client_api_fanout_26.1` on `jmchilton`, tip `4d184c6672e`, based on `origin/release_26.1` `5308aa51b16`. 7 commits, client only. Addresses galaxyproject/galaxy#23977. No PR. The pre-revision debrief is `earlier_drafts/1/implementation_debrief.md` and has full detail on each commit, the decisions and the pre-existing issues.

## Revision (2026-10-08)

John dropped commit 8, `84ec8b0f713` "E2E: invocation list requests each resource once on a cold load". It contained `test_grid_requests_each_resource_once` and the `NavigatesGalaxy.start_browser_request_log()` / `browser_api_request_paths()` helpers, and John didn't like the test. The dropped commit is still in the local clone as backup ref `backup/issue_23977_with_e2e`. The branch was force-pushed with a lease.

## Commits

1. Add sharedPromise helpers; share in-flight upload datatypes/genomes requests.
2. Load datatypes for help terms only for datatype terms.
3. API rate limiter: jittered exponential backoff between 429 retries.
4. Add useRetryGate; back off keyed-cache, history and collection retries.
5. Show loading, not blank/not found, while a retry is pending.
6. Share failures of in-flight workflow instance fetches; catch in grids.
7. Only fetch workflow invocation counts for cards that show them.

## State

- Tests: 19 touched vitest files pass (135 tests). The last full run, before the drop, was 251 files / 1872 tests with `vue-tsc` clean; the drop touched no client code.
- No E2E coverage now. The earlier test challenge dropped `HelpText.test.ts` because the E2E covered it, so that drop is being re-checked in a fresh test challenge.
- Review after the drop: `subagents/review_after_e2e_drop.md`. No code findings.
