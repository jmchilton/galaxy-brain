Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: c66b78b6ddd

Risks are minimal - this is a small, internal job-handler routing change on a release branch with no API, tool, or workflow contract changes, so it can be reverted cleanly (a two-way door).

<details><summary>Risk Details</summary>

- The handler is now resolved on the web process that received `POST /api/jobs` (tool-configured handler, else `job_config.default_handler_id`) and carried through the Celery `QueueJobs` payload, so the Celery worker no longer chooses it; deployments whose Celery workers have a different job config or `server_name` than web workers will see different handler assignment than before.
- Passing `default_handler_id` as an explicit `configured` handler can take the `_assign_handler_direct` short-circuit or change pool/tag selection versus the old `configured=None` path, so admins relying on assignment-method defaults (e.g. `db-skip-locked`, mem-self) may see jobs land on different handlers.
- `QueueJobs` gains an optional `handler` field; during a rolling upgrade, old workers receiving new payloads (or vice versa) should tolerate it, but mixed-version Celery queues are worth a glance.
- Only the async tool-request path sets `origin_job_handler`; other `_execute` callers fall back to `getattr(..., None)`, preserving old behavior there.
- No new tests cover the routing change.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that sending `default_handler_id` (rather than `None`) into `JobManager.enqueue` / `assign_handler` yields the same result as before for common deployments (single process, handler pools/tags, db-skip-locked), and that it matches what the PR intends for multi-instance setups where web and Celery workers differ.

</details>
