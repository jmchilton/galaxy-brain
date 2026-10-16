# Normal review — nightly_unit_tests

No blocking issues. Acted on #1: `758d072b3da` gives release branches the full 3.10–3.14 matrix on PRs and pushes, since schedules only run on `dev`, and updates the docs. The debrief wording from #4 is fixed in the implementation debrief.

Not acted on:
- **#2, fork-PR `startup_failure`.** Not changed; very unlikely. The caller job declares exactly the permissions the called workflow requests (`actions: read`, `issues: write`), and fork-PR tokens are capped silently rather than failing the run. The first upstream PR run of "Unit tests" from the fork is the real check. If it shows `startup_failure` with zero jobs, move the report into a `workflow_run`-triggered workflow.
- **#3, Codecov mixing.** Low impact: Codecov only has `comment: false` and no required checks. Left as is.
- **#5, schedule and dispatch can overlap.** Accepted. The reporter closes every duplicate issue on the next pass.

## Details

The subagent's report, condensed but with every finding kept:

**Should-fix**
1. Future release branches silently drop 3.10 unit tests (`unit.yaml:41`). A new branch cut from `dev` would inherit the 3.14-only matrix, with no nightly. Suggested `startsWith(github.base_ref || github.ref_name, 'release_')` in the full-matrix condition.
2. Fork PRs might hit `startup_failure` (`unit.yaml:73-79`). This is the first `pull_request` workflow with a write-permission `uses:` job. The reviewer believes the permission check uses the caller job's declared `permissions:`, which would make it fine, but couldn't confirm it from GitHub's docs. A third-party report shows an `if:`-skipped job failing at startup on a permission mismatch. Verify on the upstream PR.

**Nits**
3. Nightly Codecov `py-unit` uploads on the `dev` head include 3.10-only branches, so base coverage can sit slightly above what PRs reach. Options: skip Codecov on schedule/dispatch, or use a separate flag.
4. The latent concurrency problem (a push to `dev` cancels the Tuesday scheduled run) affects six workflows, not only `playwright.yaml`: `api`, `converter_tests`, `framework_workflows`, `integration_selenium`, `performance`, `playwright`. Out of scope; follow-up.
5. A manual dispatch and the nightly can now run at the same time and each open an issue. Acceptable. PR cancellation is unchanged.

**Checked, OK**
- The `$/` self-repository `uses:` works (scheduled Selenium run 38328731429 succeeded).
- `github.ref`, `repository_owner`, and `runId`/`runAttempt` in a called workflow are the caller's.
- `if: !cancelled()`, `permissions:` and `needs` in `with:` are all allowed on a caller `uses:` job.
- Job names are `Test (3.10)` and `<caller> / <name>`.
- The matrix idiom is standard.
- `dev` has no required status checks.
- The `area/testing` and `kind/bug` labels exist, and the dedupe can't collide with the Selenium issue.
- No regressions against the old Selenium reporter.
- Inputs go through env.
- The docs are accurate.
