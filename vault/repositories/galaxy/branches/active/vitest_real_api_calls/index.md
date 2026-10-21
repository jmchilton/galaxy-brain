# vitest_real_api_calls

Status: `branches_implemented_needs_ci`. No upstream PR. Intended upstream target: `dev`; stacked on `vitest_readability` commit `390b78fc122eb3fe11660a8c8acaf4bc5fa64c57` (dependency [PR #24038](https://github.com/galaxyproject/galaxy/pull/24038)).

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

## TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 38347319493](https://github.com/jmchilton/galaxy/actions/runs/38347319493). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `3076db79898e5db847fe05dd521e48b80034ef72` found overlapping changes in 25 paths (`client/src/components/Collections/ListCollectionCreator.test.ts`, `client/src/components/Common/RDMDestinationSelector.test.ts`, `client/src/components/Form/Elements/FormSelectMany/FormSelectMany.test.ts`, `client/src/components/Form/FormElement.test.js`, `client/src/components/History/Archiving/HistoryArchiveWizard.test.ts`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.

Requested failed-job reruns for diagnosed unrelated failures: [run 38347319493](https://github.com/jmchilton/galaxy/actions/runs/38347319493). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Dependency audit — 2026-10-16

[Exact layer boundary and core-stack restack audit](dependency_audit_2026-10-16.md). Remote head is unchanged. This branch requires its own transplant from its recorded historical cut; the stories/play core stack is now published. Existing validation and review holds remain.

## Dependent rebase — 2026-10-20

Published `0277a85df3954d1f83856933991cc5df0b97865c` onto readability `1358d37887996e552e0fac6467c8738865618d9a`. 3 own-layer commit messages/trailers preserved; exact old-head lease and remote SHA verified. Published; existing fork CI and human-review holds remain. See [current implementation and validation](implementation_debrief.md), [test challenge](test_challenges_debrief.md), and [cascade mapping](../../../../../projects/just_jesting_around/readability_assessment/dependent_rebase_2026-10-20.json).


## History organization — 2026-10-20

Published `3684d62a1e16130adfb2f2dd894e133897765ab1` with the exact preceding-head lease. Restacked the existing 3 own commits onto rewritten readability, preserving their trees, authors and exact messages.

All existing branches remain complete. No smaller review branches or PRs were created. The agreed future extraction is small domain batches (roughly 5–10 tests), when John requests it. Original heads remain in local recovery refs under `refs/archive/test-history-20261020/`. [History reorganization and verification](../../../../../projects/just_jesting_around/history_reorganization/README.md). No source changes or new test runs; existing review/CI/accessibility holds remain.


## Helpers with their consumers — 2026-10-20

Published `a277128d39aab00f29c99e5860ffe46afdd3b987` using the exact preceding-head lease. Restacked the existing 3 own commits onto rewritten readability, preserving their exact trees, messages and author/committer metadata.

All five final source trees remain identical to their preceding heads. The full experiment remains on the existing branches; no domain branches or new PRs were created. [Helper colocation, verification and current commit links](../../../../../projects/just_jesting_around/history_reorganization/consumer_colocation_2026-10-20/README.md). Existing draft, CI and full-catalog accessibility holds remain.
