Looks like I found the same thing as dannon. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via gpt-6.1-sol at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via gpt-6.1-sol at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via gpt-6.1-sol at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via gpt-6.1-sol at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via gpt-6.1-sol at medium effort.

</details>

<details><summary>Risks</summary>

This is a two-way door: deferred tool-test parsing changes when existing work runs, without introducing a persistent data format or API contract, and can be reverted cheaply.

<details><summary>Risk Details</summary>

- The first request that needs a tool's tests now pays the parsing and validation cost; malformed tests can surface at request time rather than during tool loading.
- Deferred XML parsing reconstructs a source after memory optimization, so correctness depends on that round-trip preserving the test definitions.
- Additional CI pod logs improve failure diagnosis and have no effect on deployed Galaxy behavior.

</details>

<details><summary>Risk Review Advice</summary>

Verify that test-data, tool-download and tour consumers still receive the same test definitions after tool loading and memory optimization. The new unit coverage checks lazy parsing and caching for two XML profiles; a representative endpoint check would help confirm the changed timing is acceptable.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24348_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

The review branch [`pr_24348_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24348_review_0), based on reviewed commit [`ebd02a8b4b47b2ec4d9ec406c5afb65ed81f5c2d`](https://github.com/jmchilton/galaxy/commit/ebd02a8b4b47b2ec4d9ec406c5afb65ed81f5c2d), makes deferred tool-test initialization safe for concurrent requests. A per-tool lock serializes parsing and the completed flag is published after caching the result. A real-tool regression confirms concurrent callers wait and receive complete tests from a single parse. The change is 50 insertions and one deletion, below the 200-line fix threshold. Pushed to [John’s fork](https://github.com/jmchilton/galaxy/tree/pr_24348_review_0); no author-branch push or review response was posted. Validation: the added test failed on the reviewed head and passed with the fix, run alone via `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=lib /Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest -p no:cacheprovider test/unit/app/tools/test_tool_tests_parsing.py::TestToolTestsParsing::test_concurrent_first_access_waits_for_tests -q` (1 passed). Existing dependency deprecation warnings appeared. Commit hooks, including Black, Ruff and Flake8, passed.

- [`b465fdd6e20`](https://github.com/jmchilton/galaxy/commit/b465fdd6e20) — Serialize deferred tool test parsing on concurrent access. Adds a per-tool initialization lock and a regression that blocks the initial parser while a second caller accesses the same tool.

</details>

</details>

### P2 1: Concurrent first requests can observe unfinished test parsing (implementation verified)

`parse_tests()` sets `__tests_parsed` before rebuilding the source and caching the parsed tests. A concurrent first request for the same tool therefore skips initialization and receives `None` while the first request is still parsing. `/api/tools/{id}/test_data` iterates that value without a guard, producing HTTP 500; `tests_summary` can temporarily omit the tool. The eager implementation completed parsing before serving requests, and the expensive tools motivating this change make this race particularly likely.

The review branch serializes initialization with a per-tool lock and marks parsing complete only after the cached result is ready. Its regression pauses parsing in one thread, checks that a second access waits, then verifies both callers receive the complete tests and parsing ran exactly once. The test failed on the reviewed head because the second caller returned `None`, and passed with the fix (`1 passed`; only the added test was run). Commit hooks also passed. Suggested fix: [b465fdd6e20](https://github.com/jmchilton/galaxy/commit/b465fdd6e20).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via gpt-6.1-sol at medium effort. Verified via gpt-6.1-sol at medium effort.

</details>
