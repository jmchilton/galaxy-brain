

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via GPT-6 (Codex) at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via GPT-6 (Codex) at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via GPT-6 (Codex) at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via GPT-6 (Codex) at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via GPT-6 (Codex) at medium effort.

</details>

<details><summary>Risks</summary>

This is mostly a two-way door: it changes job-completion transaction ordering without changing persisted formats or public API contracts, but regressions could affect output visibility and workflow progress across all jobs.

<details><summary>Risk Details</summary>

- Combining output updates, metrics, and the final job state changes transaction duration and lock ordering in a heavily used path; concurrency and deadlock behavior deserve attention, especially for mapped workflow jobs sharing user and invocation rows.
- Extended metadata imports now defer their commits to job completion. Failures later in completion can roll back more imported state, and existing discovery and metadata-tool commits mean atomicity still has exceptions.
- Hash queue failures and dependent timestamp update failures become logged, nonfatal errors after the job result is committed. Hashes may remain absent, and workflow or collection refreshes may rely on later polling rather than the usual timestamp signal.

</details>

<details><summary>Risk Review Advice</summary>

Review the transaction boundaries against real PostgreSQL concurrency, particularly mapped workflows, quota accounting, and extended metadata discovery. The added unit checks and reported PostgreSQL integration/API runs provide useful coverage; simultaneous completion of many jobs is the main operational behavior to scrutinize.

Confirm that delayed workflow/collection refresh and missing hashes are acceptable outcomes when the postcommit actions fail, and that their logs make those failures diagnosable. Rolling back the code is straightforward, though it will not replay missed postcommit actions.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24465_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24465_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24465_review_0) starts at reviewed head [`d7dfb46505d72d1a4d4891e2977781d721d1cd5a`](https://github.com/jmchilton/galaxy/commit/d7dfb46505d72d1a4d4891e2977781d721d1cd5a) and adds one regression test for a genuine database failure in the timestamp transaction. The test checks that the already committed job/output remain successful, timestamp changes roll back, and the session accepts a subsequent write. The change is 37 added test lines; no production changes. The coordinator pushed the branch to `jmchilton/galaxy`.

- [`7bfee985a03`](https://github.com/jmchilton/galaxy/commit/7bfee985a03837ffc71d0775e1931bf5e48df116) — Test rollback after job timestamp commit failure. Forces a SQLite uniqueness violation during the second commit after timestamp UPDATEs, then checks persisted state and session recovery.

Validation: `PYTHONPATH=lib /Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest -p no:cacheprovider test/unit/app/jobs/test_job_wrapper_finish.py::TestJobWrapperFinish::test_update_time_commit_failure_rolls_back_and_keeps_session_usable -q` — 1 passed, 4 warnings. Only the added test was run. Removing the production rollback temporarily caused the same test to fail with `PendingRollbackError`; production code was restored. Commit checks passed (Black, Ruff, Flake8, Prettier and repository hygiene hooks). The sandbox run emitted a `mirakuru` atexit `psutil` permission error after the passing result, consistent with the initial review run.

</details>

</details>

### P3 1: Exercise rollback after a database failure in the timestamp transaction (implementation verified)

`test_update_time_failure_keeps_committed_job_state` raises from the timestamp helper before it executes SQL. It therefore does not cover the failed-session state caused by a database error during the subsequent commit: removing the rollback still leaves that existing test satisfied. Add a real transaction-failure case that confirms the committed job and output remain `ok`, the timestamp updates are rolled back, and the session can execute another write. [Regression test commit](https://github.com/jmchilton/galaxy/commit/7bfee985a03837ffc71d0775e1931bf5e48df116).

The review branch adds this coverage by causing a duplicate-email constraint failure during the second commit, after the real timestamp UPDATEs. The added test passes against the PR and fails with `PendingRollbackError` when the production rollback is temporarily removed. No production-code change is needed.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via GPT-6 at low effort. Verified via GPT-6 at medium effort.

</details>
