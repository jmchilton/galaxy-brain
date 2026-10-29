### P2 1: Concurrent first requests can observe unfinished test parsing (implementation verified)

`parse_tests()` sets `__tests_parsed` before rebuilding the source and caching the parsed tests. A concurrent first request for the same tool therefore skips initialization and receives `None` while the first request is still parsing. `/api/tools/{id}/test_data` iterates that value without a guard, producing HTTP 500; `tests_summary` can temporarily omit the tool. The eager implementation completed parsing before serving requests, and the expensive tools motivating this change make this race particularly likely.

The review branch serializes initialization with a per-tool lock and marks parsing complete only after the cached result is ready. Its regression pauses parsing in one thread, checks that a second access waits, then verifies both callers receive the complete tests and parsing ran exactly once. The test failed on the reviewed head because the second caller returned `None`, and passed with the fix (`1 passed`; only the added test was run). Commit hooks also passed.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via gpt-6.1-sol at medium effort. Verified via gpt-6.1-sol at medium effort.

</details>
