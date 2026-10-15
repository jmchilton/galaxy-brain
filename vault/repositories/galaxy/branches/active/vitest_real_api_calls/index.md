# vitest_real_api_calls

Status: `branches_implemented_needs_ci`. No upstream PR. Intended upstream target: `dev`; stacked on historical `vitest_readability` commit `f0659f1cf0d69a8e17011bc3b4ef5489b02c3891` (dependency [PR #24038](https://github.com/galaxyproject/galaxy/pull/24038)).

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_real_api_calls`.

[Implementation plan](../../../../../projects/just_jesting_around/plan_real_api_fixtures.md) · [Motivation](../../../../../projects/just_jesting_around/USE_REAL_API_RESPONSES.md) · [API survey](../../../../../projects/just_jesting_around/REAL_API_SURVEY.md) · [Pipeline branches](../../../../../projects/just_jesting_around/PIPELINE_BRANCHES.md)

## Registration — 2026-10-13

John requested registering this branch and ensuring its worktree is clean and pushed. This authorizes publishing the existing implementation; no PR title, description or final-review SHA is approved.

Pushed head: `3076db79898e5db847fe05dd521e48b80034ef72`. The worktree is clean at that SHA. Three commits add fixture recorder/comparison infrastructure and a typed client loader, integrate fixture drift checks into CI, build the shared history factory from a recorded response, and capture default/distributed quota usage for DiskUsageSummary tests. The lane's own change is 17 files above its historical readability base; the comparison against `dev` also includes the inherited readability work. Keep that dependency explicit rather than presenting the whole stack as new fixture work. No rebase cascade was requested here.

The fork initially held `73ce82bcb97592faa365e80f3cf14451c9adff23`. Its CI succeeded, but that evidence does not cover the revised local head. Reflog shows the local three-commit series was reconstructed after review fixups; comparison with the intermediate reviewed tree `8608052aaea` changes only five README lines. Local-vs-fork differences include fixture-only CI triggers, stricter encoded-ID consistency checks, capture-coverage checks, use of the shared recorded history factory, and distributed quota-source coverage. Publish with an explicit old-SHA lease and retain the old remote head locally.

## Verification and publication

- Client: **56 passed in 6 suites**, covering fixture contracts, DiskUsageSummary, the shared history factory consumers, and API tests. Used pinned Node and this historical branch's single-project Vitest configuration (no `--project unit`); the initial invocation using the newer pipeline project's name failed at startup and was corrected. Log: `/private/tmp/vitest-real-api-client.log`.
- Backend: **70 passed** (67 recorder/comparator unit tests and 3 live-Galaxy capture tests) with `GALAXY_TEST_CLIENT_FIXTURES=check`. Captures match the committed fixtures; no fixture rewrites. Log: `/private/tmp/vitest-real-api-backend.log`.
- `git diff --check` passes; `git status --porcelain=v1` is empty.
- Preserved old remote head under `backup/vitest_real_api_calls-remote-20261013`. Pushed only the `jmchilton` fork using `--force-with-lease=refs/heads/vitest_real_api_calls:73ce82bcb97592faa365e80f3cf14451c9adff23`.
- Live GitHub branch SHA and `git ls-remote` match the local HEAD; upstream divergence is **0 ahead, 0 behind**. New fork CI is queued, including [Client Unit Testing](https://github.com/jmchilton/galaxy/actions/runs/38347319452). Status remains `branches_implemented_needs_ci`; no PR opened.

Repository-wide vault validation still fails on existing `vault/reviews/Untitled.md` (missing frontmatter); tracking sync is blocked by the vault's validation requirement. The registration is saved locally in this record and MY_BRANCHES.md. Unrelated files and edits are preserved.

## GOOD_MORNING — 2026-10-13

Fork head `3076db79898e` has green client, API, lint and unit checks; quota fixture capture passes in Integration. Package collection fails removed Pulsar imports (unrelated). Integration also fails private-library tool output with the job still running, and Playwright times out waiting for workflow step-parameter output. Their relationship to the inherited stack is not established; retain needs CI rather than asserting greenish coverage. No rebase cascade or PR inferred.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 38347319493](https://github.com/jmchilton/galaxy/actions/runs/38347319493). All requests accepted; reruns are pending, not passing coverage.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 38347319493](https://github.com/jmchilton/galaxy/actions/runs/38347319493). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.
