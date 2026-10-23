- [x] P2 1: Queued and running jobs in the panel never update
- [x] P2 2: Name mode depends on a tool store nothing loads, and the title fallback is dead
- [x] P2 3: Panel state isn't tied to the filter or mode that produced it
- [x] P2 4: Name search can send an unbounded `tool_id` list
- [x] P2 5: `JobPanel` uses the job detail LRU cache as a list store
- [x] P2 6: No API test for the new `total_matches` header
- [x] P3 1: `updateJob` bypasses the store's stale-response guard
- [x] P3 2: Sixth identical copy of `get_count` in `managers/`
- [x] P3 3: Shared-utility changes ride along unannounced
- [x] P3 4: Hidden upload tools are filtered on the client, which forces offset bookkeeping
- [x] P3 5: `JobCard` re-implements `GCard`'s title
- [x] P3 6: `JOB_STATES` is a hand-kept copy of the `JobState` union, and it is already missing `finishing`
- [x] P3 7: Filter vocabulary diverges from the admin Jobs list
- [x] P3 8: The invalid-filter Selenium test asserts only absence
- [x] P3 9: Test setup hygiene
- [x] P3 10: The `toolStore.test.ts` `getToolIdsByName` test duplicates the JobsFilters name-mode tests

Other Actions:
