### P3 1: Exercise rollback after a database failure in the timestamp transaction (implementation verified)

`test_update_time_failure_keeps_committed_job_state` raises from the timestamp helper before it executes SQL. It therefore does not cover the failed-session state caused by a database error during the subsequent commit: removing the rollback still leaves that existing test satisfied. Add a real transaction-failure case that confirms the committed job and output remain `ok`, the timestamp updates are rolled back, and the session can execute another write.

The review branch adds this coverage by causing a duplicate-email constraint failure during the second commit, after the real timestamp UPDATEs. The added test passes against the PR and fails with `PendingRollbackError` when the production rollback is temporarily removed. No production-code change is needed.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via GPT-6 at low effort. Verified via GPT-6 at medium effort.

</details>
