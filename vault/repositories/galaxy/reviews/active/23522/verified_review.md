### P2 1: Handler travels via an untyped `getattr` side channel on `trans` (implementation verified)

`_execute` reads `getattr(trans, "origin_job_handler", None)`, but `trans` is typed `ProvidesHistoryContext`, which has no such attribute; only `WorkRequestContext` sets it. That hides the dependency from mypy and readers, and any other context reaching `_execute` silently falls back to worker-side resolution, reintroducing the bug. The name also drifts across three layers (`QueueJobs.handler` → `WorkRequestContext.origin_job_handler` → `enqueue(handler=...)`), and the new `handler` kwarg on `JobManager.enqueue` shadows the `from galaxy.jobs import handler` module import in `manager.py`.

Thread it explicitly through `handle_input_async` → `execute_async` → `_execute` → `enqueue`, the way `preferred_object_store_id` and `credentials_context` already travel, and use one name (`job_handler`) for the `QueueJobs` field, the parameter, and the `enqueue` kwarg. `WorkRequestContext` then needs no change.

<details><summary>Evidence</summary>

Implemented as `147d0c9a4ff` on `pr_23522_review_0`; ruff/black/flake8 pass and mypy reports nothing new on the touched modules.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No test coverage (implementation verified)

No tests are added. The new precedence in `JobManager.enqueue` (an explicit handler overrides `tool.get_configured_job_handler()`) is cheap to cover with a unit test beside the existing handler-assignment tests in `test/unit/app/jobs/test_job_configuration.py`, using a real `JobConfiguration`.

Add tests asserting that `enqueue(job, tool=tool_with_h1, job_handler="h2")` assigns `h2` and that `job_handler=None` keeps the tool's `h1`. The web-to-worker wiring itself can't go red in an API or integration test, because the test web process and Celery worker share one job config.

<details><summary>Evidence</summary>

`TestJobManagerEnqueueHandler` (`5771fe951aa`): 2 passed on the branch, 2 failed against `release_26.2`'s `manager.py`.

</details>

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
