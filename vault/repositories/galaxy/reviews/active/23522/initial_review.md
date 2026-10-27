# Initial review — #23522 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), effort: medium
- Reviewed commit: `c66b78b6ddd` vs `origin/release_26.2`
- Scope: 6 files, +12/-6

## Verdict

Small, targeted fix that does the right thing for the reported case (tool-level or instance-default handler resolved on the web process, carried through `QueueJobs`, honored by `JobManager.enqueue`). Pydantic `Model` ignores extra fields, so rolling deploys with mixed new/old web and Celery are safe either way. Converter/metadata/history-import enqueues don't go through `_execute`, so they are unaffected. Main asks: replace the `getattr(trans, ...)` side channel with a typed path, add a test, and be explicit about what happens when the Celery worker's job config doesn't know the forwarded handler.

No security findings.

## Findings

### P2 1: Handler travels via an untyped `getattr` side channel on `trans`

`lib/galaxy/tools/execute.py:422` reads `getattr(trans, "origin_job_handler", None)`, but `_execute` types `trans` as `ProvidesHistoryContext`, which has no such attribute — only `WorkRequestContext` sets it. That hides the dependency from mypy and from readers, and any future context built for the async path (or a subclass that forgets the kwarg) silently falls back to worker-side resolution, reintroducing the bug. Naming also drifts across three layers: `QueueJobs.handler` → `WorkRequestContext.origin_job_handler` → `enqueue(handler=...)`.

Suggested fix: either declare `origin_job_handler: str | None = None` on `ProvidesAppContext` (so `trans.origin_job_handler` type-checks everywhere), or thread it explicitly through `handle_input_async` → `execute` → `_execute` alongside `preferred_object_store_id`/`credentials_context`, which already follow that pattern. Pick one name (e.g. `job_handler`) for the schema field, context attribute and `enqueue` kwarg.

### P2 2: No test coverage

No tests are added. The precedence change in `JobManager.enqueue` (explicit `handler` overrides `tool.get_configured_job_handler()`) and the `JobsService.create` → `QueueJobs.handler` wiring are both cheap to cover. `test/unit/app/jobs/test_job_configuration.py` already exercises `assign_handler` per method; a unit test there (or beside `JobManager`) asserting that `enqueue(job, tool=tool_with_handler_X, handler="Y")` assigns `Y`, and that `handler=None` keeps the tool's handler, would pin the new contract. A test that builds the `QueueJobs` from `JobsService.create` with a tool-configured handler and checks `task_request.handler` would cover the web side.

### P2 3: Forwarded handler is resolved on the web process but interpreted against the worker's handler map

The web process picks an ID/tag from *its* job config, but `assign_handler` runs in the Celery worker against the *worker's* `self.handlers`. That's fine for `db-skip-locked`, `db-transaction-isolation` and `db-tag`, which store the string as-is. But `_assign_handler_direct` and `db-preassign` (also reached from `db-self` whenever `configured` is set) do `self.handlers[configured]`. If the worker's config doesn't define that ID/tag — the mismatch this PR exists for — that raises `KeyError`, every method fails, and the job errors with `HandlerAssignmentError` ("Job handler assignment failed."). Before, the job ran on the wrong handler. Now it fails outright.

Suggested fix: at minimum state in the PR/docs that this requires a DB-tag-style assignment method (or matching handler definitions on the worker). Better: when the forwarded handler isn't known to the worker's config and the method needs the map, log and fall back to the previous worker-side resolution instead of failing the job.

### P3 1: Folding `default_handler_id` into `configured` changes assignment semantics when no tool handler is set

`JobsService.create` sends `tool.get_configured_job_handler() or trans.app.job_config.default_handler_id`, so whenever a default exists, `configured` is now non-None for every `/api/jobs` job. Before, the default was only a fallback inside each method. Side effects:
- `db-self`: jobs with a configured value are now sent to `db-preassign` instead of being assigned to the enqueuing process.
- `mem-self`: the "Ignoring handler assignment" warning now logs on every job.
- `_assign_handler_direct`: if the default is a single handler ID, assignment now skips the configured methods.

The PR description says "existing handler assignment logic remains unchanged", which is only true when both values are None. Mention these effects in the description. Or send only the tool-configured handler and the default separately, so the worker can keep the default as a fallback.
