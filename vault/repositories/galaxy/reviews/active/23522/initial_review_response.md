@natefoo is the right thing to do here to have a separate Celery setup for worker for VGP? Or to add a configuration option that causes the web handler to by-pass the job handler assignment abstractions? I don't know that just skipping all of the job handler abstractions when not behind some sort of flag seems wrong. -John

<details><summary>Why async jobs misroute but sync jobs don't</summary>

Handler assignment (`JobManager.enqueue` → `assign_handler`) always uses the job config of whichever process calls `enqueue`. What differs is which process that is.

- **Sync (`POST /api/tools`)**: `ToolsService` calls `tool.handle_input` → `execute` → `enqueue` inside the web process that took the request. On a subsite like VGP, that's the subsite's web process, so `tool.get_configured_job_handler()`, `default_handler_id` and the `handlers` map all come from the subsite's job config. It works.
- **Async (`POST /api/jobs`)**: `JobsService.create` only builds a `QueueJobs` payload and calls `queue_jobs.delay(...)`. The `queue_jobs` Celery task rebuilds the tool from raw source (`cached_create_tool_from_representation`) and calls `enqueue` in the Celery worker. On usegalaxy.org, VGP (`galaxy-vgp.tacc`) has its own web processes and job conf (`default: vgp`). However, it shares the Celery broker (`amqp_internal_connection` → `//main_internal`, with no `broker_url` override) and the default queue with main. So a main-host worker can pick up VGP's `queue_jobs` task and resolve the handler against main's config.

So the PR's fix is to resolve the handler in the web process (like the sync path) and send it in `QueueJobs`. P2 3 and P3 1 below follow from this: the ID is chosen with the web's config, but `assign_handler` still runs in the worker with the worker's `handlers` map.

</details>

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_23522_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_23522_review_0`](https://github.com/jmchilton/galaxy/tree/pr_23522_review_0) (on John's local PR worktree, based on reviewed head `c66b78b6ddd`) replaces the untyped `getattr(trans, "origin_job_handler", None)` side channel with an explicit `job_handler` parameter threaded from `JobSubmitter.queue_jobs` through `Tool.handle_input_async`, `execute_async` and `_execute` into `JobManager.enqueue`, matching how `preferred_object_store_id` and `credentials_context` already travel, and uses the single name `job_handler` for the `QueueJobs` field, the execute-path parameter and the `enqueue` kwarg. It then adds unit tests pinning `enqueue`'s new precedence against a real `JobConfiguration`.

- [`147d0c9a4ff`](https://github.com/jmchilton/galaxy/commit/147d0c9a4ff) Thread job_handler explicitly to JobManager.enqueue — drops `WorkRequestContext.origin_job_handler`, adds keyword-only `job_handler` to `_execute`, renames `QueueJobs.handler` and `enqueue(handler=)` to `job_handler` (the old kwarg shadowed the `galaxy.jobs.handler` module import in `manager.py`).
- [`5771fe951aa`](https://github.com/jmchilton/galaxy/commit/5771fe951aa) Test JobManager.enqueue job_handler precedence — `TestJobManagerEnqueueHandler` in `test/unit/app/jobs/test_job_configuration.py`: explicit `job_handler` beats the tool's configured handler, `None` keeps it; red on `release_26.2`'s `manager.py`, green on the branch.

</details>

</details>

### P2 1: Handler travels via an untyped `getattr` side channel on `trans` (implementation verified)

`_execute` reads `getattr(trans, "origin_job_handler", None)`, but `trans` is typed `ProvidesHistoryContext`, which has no such attribute; only `WorkRequestContext` sets it. That hides the dependency from mypy and readers, and any other context reaching `_execute` silently falls back to worker-side resolution, reintroducing the bug. The name also drifts across three layers (`QueueJobs.handler` → `WorkRequestContext.origin_job_handler` → `enqueue(handler=...)`), and the new `handler` kwarg on `JobManager.enqueue` shadows the `from galaxy.jobs import handler` module import in `manager.py`.

Thread it explicitly through `handle_input_async` → `execute_async` → `_execute` → `enqueue`, the way `preferred_object_store_id` and `credentials_context` already travel, and use one name (`job_handler`) for the `QueueJobs` field, the parameter, and the `enqueue` kwarg. `WorkRequestContext` then needs no change.

<details><summary>Evidence</summary>

Implemented as `147d0c9a4ff` on `pr_23522_review_0`; ruff/black/flake8 pass and mypy reports nothing new on the touched modules.

</details>

Fixed on the review branch in [`147d0c9a4ff`](https://github.com/jmchilton/galaxy/commit/147d0c9a4ff).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No test coverage (implementation verified)

No tests are added. The new precedence in `JobManager.enqueue` (an explicit handler overrides `tool.get_configured_job_handler()`) is cheap to cover with a unit test beside the existing handler-assignment tests in `test/unit/app/jobs/test_job_configuration.py`, using a real `JobConfiguration`.

Add tests asserting that `enqueue(job, tool=tool_with_h1, job_handler="h2")` assigns `h2` and that `job_handler=None` keeps the tool's `h1`. The web-to-worker wiring itself can't go red in an API or integration test, because the test web process and Celery worker share one job config.

<details><summary>Evidence</summary>

`TestJobManagerEnqueueHandler` (`5771fe951aa`): 2 passed on the branch, 2 failed against `release_26.2`'s `manager.py`.

</details>

Fixed on the review branch in [`5771fe951aa`](https://github.com/jmchilton/galaxy/commit/5771fe951aa).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 3: Forwarded handler is interpreted against the worker's handler map, and fails the job when unknown (implementation verified)

The web process picks an ID/tag from its own job config, but `assign_handler` runs in the Celery worker against the worker's `handlers`. `db-skip-locked`, `db-transaction-isolation` and `db-tag` store the string as-is, so they're fine. `db-preassign`, and `db-self` (which hands any configured value to `db-preassign`), look it up in `self.handlers[configured]`. If the worker's config doesn't define that ID or tag (the mismatch this PR is about), the lookup raises `KeyError`, every method fails, and the job errors with "Job handler assignment failed." Before this PR, the job ran on the wrong handler. Now it fails outright.

<details><summary>Evidence</summary>

Unit repro against a real `JobConfiguration`, worker config `<handler id="worker_main"/>`, `enqueue(job, tool=tool, job_handler="vgp_handler")`:

```python
# assign_with="db-preassign"   -> raises ToolExecutionError ("Job handler assignment failed.")
# assign_with="db-self"        -> raises ToolExecutionError (routes to db-preassign)
# assign_with="db-skip-locked" -> job.handler == "vgp_handler"
```

</details>

State the requirement in the PR description, and ideally in the job config docs: a DB-tag-style assignment method (`db-skip-locked` / `db-transaction-isolation`), or matching handler definitions on the Celery workers. Optionally, make the failure clearer, for example by logging that the forwarded handler is unknown to this process's job config. Don't silently fall back to worker-side resolution: that would bring back the misrouting this PR fixes.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Forwarding `default_handler_id` changes assignment semantics when the tool has no handler (implementation verified)

`JobsService.create` sends `tool.get_configured_job_handler() or job_config.default_handler_id`, so whenever a default exists, `configured` is now non-None for every `/api/jobs` job. Before, the default was only a fallback inside each assignment method. The PR description says "existing handler assignment logic remains unchanged", which holds only when both values are `None`. The side effects:

- `db-self` now preassigns from the default tag instead of assigning the enqueuing process.
- `mem-self` logs "Ignoring handler assignment" on every job.
- If the default is a single handler ID, `_assign_handler_direct` short-circuits the configured methods.

<details><summary>Evidence</summary>

Same unit repro, `<handlers assign_with="db-self" default="pool">` with `h1`, `h2` tagged `pool`, server_name `main`:

```python
# enqueue(job, tool=tool, job_handler=None)   -> job.handler == "main"  (previous behaviour)
# enqueue(job, tool=tool, job_handler="pool") -> job.handler in ("h1", "h2")
# assign_with="mem-self", default="h1", job_handler="h1" -> logs "Ignoring handler assignment ..."
```

</details>

Mention these effects in the PR description. Alternatively, forward only the tool-configured handler, and handle the subsite's default separately if that is needed for the VGP case.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
