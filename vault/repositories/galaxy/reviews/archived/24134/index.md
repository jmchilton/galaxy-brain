# PR #24134 — Run Python test suites with pytest-xdist

**Latest status — 2026-10-15:** Merged at 2026-10-15T15:58:43Z; tracking ended. Review draft was not posted by this agent. Clean worktree HEAD exactly matched the merged PR head; removed with `ghwt rm` under the no-upstream exception.

- PR: https://github.com/galaxyproject/galaxy/pull/24134
- Review date: 2026-10-15.
- Reviewed commit: `63617b34db7b5f3396a9fe75779fe2136258dcff`, targeting `release_26.2`.
- Recommendation: **APPROVE**; no actionable findings.
- Delivery: **UNPOSTED**. Draft below; no GitHub review or comment submitted.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24134` (clean after validation).

## Review

Inspected the complete diff and surrounding test-driver, database configuration, integration fixture, Tool Shed fixture, and workflow setup. Worker databases are separated for ordinary embedded servers; integration classes retain their per-instance database setup. Socket reservations remain listening until uvicorn takes them over. Integration lanes partition host-service tests from the parallel shards, while custom loadscope schedulers keep Keycloak/container scopes and dependent Tool Shed modules together. Tool Shed dependency groups are derived transitively from the repository names used by the actual test modules.

The production edits are small but included in the review: concurrent directory creation tolerates an existing directory; hgweb updates persist the modified parser and serialize forced rereads with writers; user selection filters the current reactive users list. The changed API/browser tests retain their assertions and wait for the asynchronous operations they depend on. Coverage removal on PR events is explicit; push/scheduled coverage remains configured. No existing discussion or reviews at the final check.

## Validation

Local environment: macOS, Python 3.13.12, pytest 9.1.1 and pytest-xdist 3.8.0; Galaxy's existing dependency environment plus isolated temporary xdist dependencies. No source edits were needed.

- `PYTHONPATH=lib:/tmp/pr24134-review-deps /Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest -o addopts='' -p no:cacheprovider test/unit/test_driver/test_driver_util.py test/unit/test_shard.py -n 2`: **19 passed**. Covers reserved-port exclusion/release, per-worker Postgres/SQLite URL handling, existing driver behavior, deterministic shard partitioning and whole-class assignment.
- Same command for `test/unit/app/tools/test_expression_basics.py -n 2`: **54 passed, 1 skipped**. Includes the changed asynchronous worker-exit assertion.
- Six temporary checks against AST-extracted scheduler/lane helpers: **6 passed**. Checked complementary integration lanes across all configured resource prefixes, invalid-lane rejection, shared-scope name ordering, Keycloak class grouping, all actual cross-module Tool Shed repository-name dependencies, and transitive grouping. These exercise helper logic, not a replacement full integration run.
- Reserved-socket handoff smoke: started uvicorn on the reserved socket, received the expected HTTP 200 JSON response, and shut down/joined the server thread successfully.
- GitHub status at the reviewed head: **57 successful checks, 3 skipped, none pending or failing**. Includes both default integration shards, the serial host-services lane, API, browser, Tool Shed, tool/workflow framework, and both Python unit-test versions. Two workflow runs are labelled failed despite their only check jobs being skipped; no failing executed check was reported.

Full Docker/Postgres/browser suites were not rerun locally; their results above are observed CI evidence. No interactive visual testing was needed for the CI changes, and the small Tool Shed selector change was inspected in source.

## Risks

This is a two-way door: no API, workflow format, database schema, or persistent user behavior contract changes. Runtime risk is low; CI reliability exposure is moderate because many suites now execute concurrently and integration lane membership is maintained explicitly.

<details><summary>Risk Details</summary>

- Future tests that share fixed host resources must join the appropriate scope/lane; otherwise parallel execution can expose resource conflicts.
- Tool Shed scheduling infers dependencies from literal repository names with the numbered naming convention. New dependencies expressed differently need explicit attention.
- Parallel workers use more simultaneous memory/processes and can expose timing-sensitive failures. The reduced integration worker count and dedicated host-services job address the largest shared-resource cases.
- PR runs deliberately lose patch coverage reporting; coverage collection remains on pushes/schedules. This is a review-signal tradeoff, documented in the PR.
- Production directory creation, hgweb concurrency, and reactive selector fixes are narrow and reversible.

</details>

<details><summary>Risk Review Advice</summary>

Maintainers should consider the loss of PR patch coverage and watch subsequent CI runs for shared-resource flakes or runner pressure. The full green CI run and focused local driver/scheduler checks support approval; reverting workflow parallelism remains straightforward if operational issues appear.

</details>

## Approval draft

Reviewed at `63617b34db7b5f3396a9fe75779fe2136258dcff`. No actionable findings. The per-worker database and reserved-socket changes fit the embedded-server model, and the lane/scope scheduling handles the existing shared-resource cases coherently.

Validated 19 driver/shard tests and 54 expression tests under xdist (one skipped), six focused scheduler/lane checks, and an actual reserved-socket uvicorn HTTP handoff. All 57 executed CI checks are green; three checks are skipped.

Risk is low for Galaxy runtime behavior and moderate for CI reliability because of the broader concurrency and explicitly maintained shared-resource grouping. This is reversible; the loss of PR patch coverage is an intentional tradeoff documented in the PR. Approve.
