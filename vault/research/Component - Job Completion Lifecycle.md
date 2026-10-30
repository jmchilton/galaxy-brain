---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
  - galaxy/models
  - galaxy/datasets
  - galaxy/workflows
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 3
ai_generated: true
component: Job Completion Lifecycle
galaxy_areas:
  - lib
  - models
  - datasets
  - workflows
summary: "How MinimalJobWrapper.finish() commits outputs, metrics and the terminal job state, then wakes collections, schedulers and Celery"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/24465"
  - "https://github.com/galaxyproject/galaxy/pull/24511"
related_prs:
  - 24465
  - 24511
related_notes:
  - "[[Component - Post Job Actions]]"
  - "[[Component - Collection Models]]"
  - "[[Component - Collection Tool Execution Semantics]]"
  - "[[Component - Galaxy Pulsar Runner Code Sharing]]"
  - "[[Component - Private Object Stores]]"
  - "[[Component - Jobs API and Job Cache]]"
  - "[[Component - Pulsar Input Staging]]"
---

# Job Completion Lifecycle

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA. [PR #24465](https://github.com/galaxyproject/galaxy/pull/24465) (merged to `release_26.2` on 2026-10-26 as `cce99870510`) is already on `dev` here, so this note describes the merged transaction layout. [PR #24511](https://github.com/galaxyproject/galaxy/pull/24511) is still open and is described separately under [Disk accounting](#disk-accounting).

## Scope

In scope: what happens after a runner decides a job's command has finished. That covers `MinimalJobWrapper.finish()` (`lib/galaxy/jobs/__init__.py:2241-2592`), its ordinary and extended-metadata output paths, which code owns each database commit, the final job state write, metrics, disk accounting, Celery hand-offs, the `update_time` bumps on collections and workflow invocation steps, and which observers depend on all of it. It also contrasts `finish()` with the other `Job.set_final_state()` callers.

Out of scope: runner startup, job preparation and submission, the tool-side meaning of individual post job actions (see [[Component - Post Job Actions]]), and how discovered collections are structured (see [[Component - Collection Models]]).

## The contract in one paragraph

`finish()` does all of its output work in one open SQLAlchemy transaction. It then sets the final job state and commits once, so the outputs, the job's metrics and the terminal job state become visible together (`:2552-2559`). Only after that commit does it queue Celery hash tasks and bump `update_time` on the job's collections and workflow invocation steps, in a second short transaction (`:2561-2582`). Failures in those two post-commit steps are logged and leave the committed result alone. A failure before the commit propagates to the runner, which calls `fail()`. Two exceptions to the single-commit rule remain: chunked commits during output discovery and `SetMetadataTool.exec_after_process`.

## Who calls `finish()`

| Caller | Location | On exception |
|---|---|---|
| `AsynchronousJobRunner._finish_or_resubmit_job`, used by most cluster runners | `lib/galaxy/jobs/runners/__init__.py:776-889` | `job_wrapper.fail("Unable to finish job", exception=True)` (`:887-889`) |
| `PulsarJobRunner._finish_pulsar_job` | `lib/galaxy/jobs/runners/pulsar.py:878-892` | same, passing `job_metrics_directory` |
| `BaseJobRunner.prepare_job` when the tool produced no command line | `lib/galaxy/jobs/runners/__init__.py:398-400` | not wrapped |
| Task runner, godocker | `lib/galaxy/jobs/runners/tasks.py:145`, `godocker.py:210,218` | runner-specific |

Before calling `finish()`, `_finish_or_resubmit_job` reads the tool streams, runs `check_tool_output`, commits the job with its streams (`:844-846`), and handles resubmission. It passes `check_output_detected_state` so `finish()` doesn't rerun stdio checks.

## Walkthrough of `finish()`

| Step | Lines | What happens | Commits? |
|---|---|---|---|
| 1. Reclaim ownership | 2280-2284 | `reclaim_ownership()`; on failure `fail()` | via `fail()` |
| 2. Already terminal | 2287-2293 | If the job is `DELETED` or `ERROR`, return `fail()` | via `fail()` |
| 3. Decide `final_job_state` | 2295-2319 | `OK` only if stdio checks pass and `galaxy.json` reports no failed outputs. The job's `state` column is **not** written yet | no |
| 4. Move outputs (ordinary path) | 2321-2340 | Move `false_path` to `real_path` when outputs went to the working directory | no |
| 5a. Extended metadata import | 2344-2382 | See [below](#extended-metadata-path) | no (`commit=False`) |
| 5b. Ordinary discovery and per-output finish | 2391-2458 | `discover_outputs()`, then `_finish_dataset()` on every HDA/LDDA sharing each output's `Dataset`; set `Dataset.state = OK` unless already `ERROR`/`DEFERRED` | only chunked discovery |
| 6. Error fan-out | 2460-2471 | If `ERROR`, set all output datasets to `ERROR` and `pause()` jobs that depend on them | no |
| 7. Post job actions | 2473-2475 | Run every non-immediate PJA with `final_job_state` | no |
| 8. Exit code, sizes, quota | 2480-2523 | `set_total_size()`, `full_delete()` for purged outputs, `adjust_total_disk_usage()` for `job.user` | no (labelled quota sources write SQL immediately) |
| 9. Collect hash requests | 2498-2519 | Build `ComputeDatasetHashTaskRequest`s; not queued yet | no |
| 10. Tool hooks | 2527-2547 | `tool.exec_after_process(...)` may return a Celery signature (`task_wrapper`); then legacy `call_hook` | `SetMetadataTool` commits |
| 11. Final fix-ups | 2549-2550 | `_set_unknown_output_extensions_to_data`, `_fix_output_permissions` (chmod walk of outputs) | no |
| 12. Metrics + state + commit | 2555-2559 | `_collect_metrics` (skipped for task-split jobs), `job.set_state(final_job_state)`, `sa_session.commit()` | **main commit** |
| 13. Queue hash tasks | 2562-2569 | `compute_dataset_hash.delay()` per request; exceptions logged | no |
| 14. Dependent `update_time` | 2577-2582 | `job.touch_dependent_update_times()` + commit; on exception log and roll back | **second commit** |
| 15. Error report or metadata task | 2583-2588 | `_report_error()` if `ERROR`, else `task_wrapper.delay()` | no |
| 16. Cleanup | 2589-2592 | Delete working directory per `cleanup_job`; exceptions logged inside `cleanup()` | no |

### Ordinary path detail

`_finish_dataset()` (`:2139-2239`) runs for every HDA and LDDA of an output's `Dataset`, so copies made while the job ran are finished too. Discovered datasets skip this and instead copy metadata attributes to their sibling instances (`:2438-2445`). For each instance it:

- retries `os.stat` / `os.chown` to defeat NFS attribute caching (`retry_job_output_collection`),
- appends tool stdout and stderr to `info`, sets `tool_version`, and moves the file into the object store via `__update_output`,
- collects extra files,
- on `ERROR`, sets the blurb and unhides outputs that aren't part of an implicit collection,
- otherwise resolves `auto` / `data` extensions from `galaxy.json`, then loads external metadata. If external metadata failed, it retries internally (`retry_metadata_internally`), marks `FAILED_METADATA`, or for expression tools accepts the dataset as is,
- sets the peek.

The `Dataset.state = OK` write (`:2452-2458`) is the moment an output becomes ready, but nobody outside the session sees it until the main commit.

### Extended-metadata path

With `metadata_strategy: extended`, the job itself sets metadata and moves outputs, and writes a model store to `<working_dir>/metadata/outputs_populated`. `finish()` imports that store (`:2346-2356`) with `ImportOptions(allow_dataset_object_edit=True, allow_edit=True)` and `commit=False`.

- `ModelImportStore.__init__` stores `commit` (`lib/galaxy/model/store/__init__.py:318,335-336`). `_flush()` commits only when it is true and otherwise flushes (`:1487-1491`). `perform_import` ends in `_flush()` (`:446-466`), and `_import_jobs` calls it too (`:1372`). Every other import keeps the default `commit=True`.
- For an existing job (the one being finished), `_import_jobs` connects job I/O and attributes but does **not** apply the serialized state. It records it in `object_import_tracker.job_states_by_id` (`:1385-1398`). `finish()` reads it and downgrades `final_job_state` to `ERROR` if the job reported `error` (`:2374-2375`).
- Datasets discovered by the job are created by the import without permissions. `finish()` loads them with their `Dataset.actions` and applies default permissions through `PermissionProvider` once per shared `Dataset` (`:2360-2371`). Precreated outputs already got permissions at job creation.
- The ordinary step 5b, including `_finish_dataset()`, does not run on this path. Version strings are also not collected (`:2383-2386`).

Because nothing commits, flushed-but-uncommitted import rows ride along in the main commit. If a later step raises before the commit, they stay pending in the session, and the runner's `fail()` commits whatever is still in the session together with the error state.

## Transaction ownership

| Writer | Commits? | Notes |
|---|---|---|
| `finish()` main commit (`:2559`) | yes | outputs, PJA effects, sizes, quota, metrics, `job.state`, `JobStateHistory` |
| `touch_dependent_update_times` (`:2577-2582`) | yes, separately | short transaction; rolled back on failure |
| Extended-metadata import | no | `commit=False`, flush only |
| Discovery, `flush_per_n_datasets` chunks | yes | `ModelPersistenceContext` calls `self.flush()` after each full chunk (`lib/galaxy/model/store/discover.py:405-419`). The job-bound `JobContext.flush()` is `sa_session.commit()` (`lib/galaxy/tools/__init__.py:1113-1114`). Default chunk size is 1000 (`config/sample/galaxy.yml.sample:2468`), so this only fires for large discoveries |
| `SetMetadataTool.exec_after_process` | yes | commits per input dataset (`lib/galaxy/tools/__init__.py:3601-3639`) |
| Labelled quota source | not a commit, but immediate | `adjust_total_disk_usage` runs an upsert on `user_quota_source_usage` right away (`lib/galaxy/model/__init__.py:1151-1177`), so that row stays locked until the main commit |
| Celery tasks | own sessions | run after the main commit, load rows by id |

PR #24465 left the two early commits alone deliberately. With them, discovered HDAs in a large discovery and metadata-tool inputs can become visible while the job still reads `running`.

## Terminal state persistence

`Job.set_state()` (`lib/galaxy/model/__init__.py:2211-2239`) has two modes:

- **Non-finished target state** on a persisted job: a guarded `UPDATE job SET state=... WHERE state NOT IN (target, *finished_states)`. A job that has already finished can't be moved back to `running` or `queued` by a stale handler.
- **Finished target state** (`OK`, `ERROR`, `DELETED`, `DELETING`; `:1819-1821`): a plain attribute assignment, with no guard. This is what `finish()` and `fail()` use, so a later `fail()` can overwrite a committed `ok` (see [Failure boundaries](#failure-boundaries)).

Both modes append a `JobStateHistory` row.

`MinimalJobWrapper.change_state()` (`lib/galaxy/jobs/__init__.py:1738-1763`) is the path for non-terminal transitions. It refuses to change a terminal job and calls `Job.update_output_states()` (`lib/galaxy/model/__init__.py:2548-2592`), which mirrors the job state onto `dataset.state`, HDA/LDDA `info`, and HDCA/collection `update_time`. `finish()` doesn't use it. It sets dataset states itself.

## `set_final_state` vs `set_state` + `touch_dependent_update_times`

`Job.set_final_state(state)` (`:2471-2473`) is `set_state(state)` followed by `touch_dependent_update_times()` in the same transaction. `touch_dependent_update_times()` (`:2475-2500`):

1. `update_hdca_update_time_for_job` bumps HDCAs whose `job_id` is this job (`:2463-2469`).
2. `touch_output_collections_update_time` bumps every collection containing the job's output datasets, recursively through parent collections. On PostgreSQL it runs in a savepoint and can use `SKIP LOCKED`. Failures are logged and swallowed (`:2502-2527`).
3. Raw SQL bumps `workflow_invocation_step.update_time` for steps with this `job_id`, and for steps whose `implicit_collection_jobs_id` contains this job.

Callers at this SHA:

| Caller | What it does |
|---|---|
| `finish()` | `set_state` in the main transaction, then `touch_dependent_update_times` in its own transaction. A mapped-over step has one `workflow_invocation_step` row that every element job bumps, so keeping that `UPDATE` out of the main transaction keeps contention on that row away from the transaction that also holds the user's quota row |
| `fail()` (`lib/galaxy/jobs/__init__.py:1666`) | `set_final_state(ERROR)`, one commit with the error outputs |
| `JobHandlerStopQueue.__delete` (`lib/galaxy/jobs/handler.py:1197-1203`) | `set_final_state(DELETED or ERROR)` for `DELETING` jobs. The monitor step wraps it in `with sa_session.begin()` (`:1217-1223`) |
| Unit tests | `test/unit/data/model/test_touch_collection_update_time.py:362-413` |

## Failure boundaries

**Before the main commit.** Steps 1-2 and any explicit failure (unreadable output, extended import error, `exec_after_process` error) call `fail()` directly. Any other exception escapes `finish()` and the runner calls `fail("Unable to finish job", exception=True)`. `fail()` (`:1580-1702`):

- refreshes the job and its outputs, which drops their unflushed changes,
- collects metrics if the working directory exists,
- unless the job is `DELETED`: moves outputs back, sets every output to `ERROR`, unhides it, pauses dependent jobs, `set_final_state(ERROR)`, writes streams and exit code, and commits,
- always reports errors, runs `EmailAction` PJAs, calls `tool.job_failed`, and cleans up.

**After the main commit.** Hash queueing and the `update_time` bump are guarded and logged. A missed bump doesn't stall workflows, because the scheduler checks job and dataset states directly and has a backfill timer (below). `task_wrapper.delay()` and `_report_error()` are **not** guarded. An exception from either reaches the runner's `fail()`, which can flip an `ok` job to `error` after observers have seen it ok. Tracked in `vault/agents/gx_research/research_issues/finish-post-commit-failures-flip-ok-job.md`.

**Before #24465.** Outputs were committed `ok` in one transaction and `set_final_state` ran in a later one, so API clients could see finished outputs on a still-`running` job. That caused the flaky `assert 'running' == 'ok'` in `test_runtime_environment_warning`. Failures in hash queueing or the bump also used to reach `fail()` and flip `ok` to `error`.

## Metrics

`_collect_metrics()` (`:2667-2684`) asks the job-metrics plugins for properties from the job's metrics directory (Pulsar passes a staged `job_metrics_directory`) and calls `add_metric` for each non-`None` value. In `finish()` it runs immediately before `set_state` (`:2555-2557`), so a job that reads terminal through `/api/jobs/{id}` already has its `/api/jobs/{id}/metrics`. Task-split jobs skip it because their tasks collected metrics already. `fail()` collects metrics too, when the working directory exists.

## Disk accounting

### Baseline at this SHA

`finish()` sums `set_total_size()` over `job.output_datasets`, using the quota source of the last output for the whole sum. It calls `full_delete()` on outputs purged while the job ran, and then calls `job.user.adjust_total_disk_usage(collected_bytes, label)` when the source is quota-tracked (`:2484-2523`). Only `job.user` is charged.

- Default source: `user.disk_usage = (user.disk_usage or 0) + amount`, a Python read-modify-write written at the main commit (`lib/galaxy/model/__init__.py:1149-1150`).
- Labelled source: an immediate upsert into `user_quota_source_usage` (`:1151-1177`), which holds that row lock from step 8 through the main commit, across `exec_after_process` and `_fix_output_permissions`.
- A purged output resets the running sum to 0, which drops the bytes of outputs counted before it. Tracked in `vault/agents/gx_research/research_issues/finish-purged-output-resets-collected-bytes.md`.

`fail()` charges nothing at this SHA.

### Proposed by #24511 (open, `[25.1]`, not on `dev`)

PR #24511 (open on `release_25.1`) would change this. It is not merged and not described elsewhere in this note:

- `finish()` keeps the `set_total_size()` / `full_delete()` loop but replaces the sum with `self._charge_outputs([...output datasets])`.
- `_charge_outputs` charges **every user holding an HDA** of each non-purged output, found with `model.dataset_holders()`. That covers the history owner, an anonymous user who logged in mid-job, and owners of copies made while the job ran. It locks users in ascending id order and flushes each user, so the `galaxy_user` row lock is held from that point through tool post-processing to the main commit.
- `fail()` charges partial outputs too. Before refreshing outputs it collects those with `total_size is None`, then charges them. `total_size is None` therefore becomes the "not yet charged" marker, which constrains any reordering of `finish()`: `set_total_size()` and the charge have to move together.
- Default-source writes become SQL increments (`coalesce(disk_usage, 0) + delta`) instead of overwrites.

Refresh this section once #24511 merges forward to `dev`. A broader quota note is queued as `user_disk_usage_accounting`.

## Celery hand-offs

- **Dataset hashes.** Requests are built only when `final_job_state` is `OK`, the dataset is `OK`, not purged, and has no hashes, and `calculate_dataset_hash` is `always` (or `upload` for `upload1` / `__DATA_FETCH__`), and Celery is enabled (`:2498-2519`). They are queued after the main commit (`:2561-2569`), because `DatasetManager.compute_hash` loads the dataset by id (`lib/galaxy/managers/datasets.py:172-173`) and a discovered dataset only exists for other sessions once that commit is done. Queueing is best effort: a broker error is logged and the hash is simply missing.
- **Expression-tool metadata.** `ExpressionTool.exec_after_process` copies the selected input into the output. If the datatype changes and Celery is enabled, it sets the output to `SETTING_METADATA` and returns `set_metadata.si(...)` (`lib/galaxy/tools/__init__.py:3443-3490`). `finish()` dispatches it after both commits (`:2585-2588`). `SETTING_METADATA` is a non-ready state, so dependent jobs and workflow steps wait for the task.

Neither hand-off is durable. Nothing records a pending task in the database, so a lost message isn't retried.

## Observers and what they depend on

| Observer | Reads | Depends on |
|---|---|---|
| API clients polling `/api/jobs/{id}` and `/metrics` | `job.state`, metrics | main commit (state, outputs and metrics are atomic) |
| History panel polling | history contents with `q=update_time-ge` (`client/src/watch/watchHistory.js:84`) | HDA rows from the main commit; HDCA and collection `update_time` from the second commit |
| Workflow scheduler, dependency checks | `Job.state in finished_states`, HDA/`Dataset` state not in `non_ready_states`, collection `populated_state`, step action (`lib/galaxy/workflow/scheduling_manager.py:404-470`) | main commit |
| Workflow scheduler, change detection | `history.update_time` and `max(workflow_invocation_step.update_time)` snapshots (`:318-405`, `lib/galaxy/model/__init__.py:10077-10082`) | second commit |
| Workflow scheduler, backfill | time since the last scheduling attempt, default 300 s (`GALAXY_SCHEDULER_BACKFILL_SECONDS`, `scheduling_manager.py:62,340-345`) | nothing, it's the fallback |
| `DeleteIntermediatesAction` on a sibling job | other jobs' `state` in `[OK, DELETED]` (`lib/galaxy/job_execution/actions/post.py:483`) | the siblings' committed state. Two jobs finishing concurrently each see the other as unfinished, so neither cleans up. The action's own comment notes the lag (`:431`) |
| Dependent jobs | input dataset states (job handler readiness) | main commit; `pause()` writes on error ride along with it |
| Celery `compute_dataset_hash`, `set_metadata` | dataset by id | main commit, by dispatch order |

### How scheduling detects progress

`WorkflowRequestMonitor.__attempt_schedule` (`scheduling_manager.py:549-592`) takes an `InvocationUpdateSnapshot` *before* scheduling, so anything committed while a scheduling pass runs is noticed on the next pass. `ready_to_schedule_more` (`:367-405`) schedules again when any of the following holds:

- nothing was tracked for the invocation, or the maximum duration was exceeded,
- the backfill interval passed,
- the last pass reported more work or untracked delays,
- a tracked dependency (job, HDA, collection or step) is now finished, ready or populated, checked by batched count queries (`_any_dependency_satisfied`, `:404-470`),
- the history or step `update_time` differs from the previous snapshot.

Job completion feeds the scheduler through two channels. The main commit makes tracked job and HDA dependencies satisfiable. The second commit's step `update_time` bump catches changes that aren't tied to a tracked dependency. That is why #24465 could move the bump out of the main transaction and make it best effort without stalling invocations.

## Tests

- `test/unit/app/jobs/test_job_wrapper_finish.py` records each commit with a `before_commit` listener and asserts:
  - the job is `ok` exactly when its outputs are, on the ordinary and the extended-metadata path (`:54`, `:115`),
  - metrics are committed with the final state (`:61`),
  - hash tasks are queued only after the commit (`:70`),
  - the HDCA `update_time` is bumped (`:92`),
  - hash-queue and `update_time` failures keep the committed `ok` state (`:82`, `:108`).
- `test/unit/data/model/test_touch_collection_update_time.py:362-413` covers `set_final_state` and its tolerance of collection-touch failures.
- `test/unit/app/jobs/test_runner_finishing_state.py` covers Pulsar's recovery of jobs interrupted during the staged finishing tail.
- Integration: `test/integration/test_extended_metadata*.py`, `test_runtime_environment.py`, and `lib/galaxy_test/api/test_jobs.py`.

There are no unit tests for exceptions from `task_wrapper.delay()` or `_report_error()` after the commit, and none for the chunked-discovery or `SetMetadataTool` early commits.

## Related

- [[Component - Post Job Actions]]: which PJAs run in step 7 and which are immediate (`ActionBox.immediate_actions`, `post.py:587`).
- [[Component - Collection Models]]: the HDCAs and implicit collections whose `update_time` the completion path bumps.
- [[Component - Collection Tool Execution Semantics]]: map-over jobs that share one `workflow_invocation_step` row through `implicit_collection_jobs`.
- [[Component - Galaxy Pulsar Runner Code Sharing]]: Pulsar's staged finish and metadata hand-off into `finish()`.
- [[Component - Pulsar Input Staging]]: how a Pulsar job's outputs are posted back through the job files API before `finish()`.
- [[Component - Private Object Stores]]: quota sources and which stores count toward usage.
- Review records: `vault/repositories/galaxy/reviews/archived/24465/`, `vault/repositories/galaxy/reviews/active/24511/`.
