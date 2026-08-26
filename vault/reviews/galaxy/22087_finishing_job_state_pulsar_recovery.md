# PR 22087 — Add FINISHING job state and pulsar recovery for restart safety

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/22087 |
| **Author** | natefoo |
| **Base branch** | `dev` |
| **Head reviewed** | `6e1e224e8a` (single commit, 2026-03-12; merge-base `d77ed6e740`) |
| **`dev` compared against** | `8bd272a050` (FETCH_HEAD at review time, 2026-08-25) |
| **Size** | 6 files, +13 / −4 |
| **State** | OPEN, not draft, 0 reviews, 1 comment (mvdbeek, 2026-05-22) |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/22087` |
| **CI** | **Red across the board** and has been since the day it was pushed. FAILURE: API tests (both shards), Integration (all 4 shards), Selenium (all 3), Playwright (all 3), Integration Selenium, Performance tests, **Validate OpenAPI schema (both 3.10 and 3.14)**. Green: unit, lint, packages, startup. GitHub reports `mergeable: MERGEABLE`, `mergeStateStatus: UNSTABLE` — i.e. no conflict, just failing checks. |
| **Verdict** | **Request changes.** The problem is real and the shape of the fix (a durable marker so a handler restart can resume a job that is mid-metadata) is the right instinct. But `FINISHING` is introduced through `JobWrapper.change_state`, which propagates the job's state string verbatim onto every output `dataset` row — and `finishing` is not a valid `DatasetState`. That crashes history serialization with a `KeyError`, and where it doesn't crash it makes the history read as `error`. That is the root cause of the red CI, and it is a P1. Separately, the marker is set in code shared by eight runners while recovery is implemented only for Pulsar, so DRMAA/k8s/condor/cli jobs that were previously recoverable now wedge in `FINISHING` forever. |

---

## What it does

Adds `FINISHING = "finishing"` to `JobState` (`lib/galaxy/schema/schema.py:133`), which is
`Job.states` via the `states: TypeAlias = JobState` alias (`lib/galaxy/model/__init__.py:1705`).
Then:

- `lib/galaxy/jobs/runners/__init__.py:465` — `job_wrapper.change_state(model.Job.states.FINISHING)`
  immediately before the synchronous `set_job_metadata.delay(...).get()` in
  `_handle_metadata_externally`.
- `lib/galaxy/model/__init__.py:1719` — `FINISHING` added to `Job.non_ready_states`.
- `lib/galaxy/managers/jobs.py:2079,2081` — `get_jobs_to_check_at_startup` now returns `FINISHING`
  jobs in both the `track_jobs_in_database` and the non-tracking branch.
- `lib/galaxy/jobs/runners/pulsar.py:840-842` — `recover()` gets a `FINISHING` branch that calls
  `self.mark_as_finished(job_state)`.
- `lib/galaxy/jobs/runners/pulsar.py:1105-1106` — in `__async_update`, on a `complete`/`cancelled`
  message, `job.handler = self.app.config.server_name`.
- `lib/galaxy_test/base/populators.py:4198` — `"finishing"` added to `wait_on_state`'s `skip_states`.

### What checks out

- **Adding `FINISHING` to `non_ready_states` is not cosmetic and is correct.** That list gates
  `lib/galaxy/webapps/galaxy/api/job_files.py:204` and
  `lib/galaxy/webapps/galaxy/api/job_tokens.py:66` — a job that is no longer in a non-ready state
  cannot push files back or mint a token. The celery metadata task and Pulsar staging both need that
  window to stay open, so the addition is required, not incidental.
- **`is_terminal` correctly does *not* gain `FINISHING`** (`lib/galaxy/model/__init__.py:1739-1752`),
  and neither do `terminal_states` / `finished_states` (`:1708-1710`). That is right — a job in
  `FINISHING` is genuinely not done.
- **No DB migration is needed.** `job.state` is `String(64)` (`lib/galaxy/model/__init__.py:1597`),
  not a native enum, and the `Check database indexes` CI jobs are green on all three DB matrix
  entries. Worth stating explicitly so nobody blocks on this.
- **No function-level imports introduced.** The `from galaxy.celery.tasks import set_job_metadata`
  above the new line is pre-existing (it is there at `FETCH_HEAD` too).
- **`app.config.server_name` is the right identity for `job.handler`** — that is exactly what the
  handler grab query writes (`lib/galaxy/jobs/handler.py:166`) and what
  `get_jobs_to_check_at_startup` filters on. The value is not wrong; the way it is written is (P2-2).

---

## Findings

### P1-1 — `FINISHING` propagates onto output `dataset` rows, where it is not a legal state

**Where:** `lib/galaxy/jobs/__init__.py:1583-1608` (`MinimalJobWrapper.change_state`),
`lib/galaxy/model/__init__.py:2357-2409` (`Job.update_output_states`),
`lib/galaxy/schema/schema.py:84-105` (`DatasetState`).

`change_state` ends with:

```python
state_changed = job.set_state(state)
self.sa_session.add(job)
if state_changed:
    job.update_output_states(self.app.application_stack.supports_skip_locked())
```

and `update_output_states` issues raw SQL (`lib/galaxy/model/__init__.py:2360-2367`):

```sql
UPDATE dataset SET state = :state, update_time = :update_time WHERE dataset.job_id = :job_id
```

with `params = {..., "state": self.state, ...}` (`:2407`). So the **job's** state string is written
directly into `dataset.state`, bypassing the `DatasetInstance.state` setter entirely. Every state
that reaches `change_state` today is also a valid `DatasetState` — I checked all 31 call sites; they
use `NEW`, `QUEUED`, `RUNNING`, `OK`, `ERROR`, and `DELETED`. `DatasetStateField`
(`lib/galaxy/schema/schema.py:200-204`) even carries an explicit
`BeforeValidator(lambda v: "discarded" if v == "deleted" else v)` — the job↔dataset state alignment
is a maintained invariant, not an accident. `finishing` is the first value to break it.

Four downstream consequences, in descending severity:

1. **Hard `KeyError` → 500 on history serialization.**
   `HistorySerializer.serialize_state_counts` (`lib/galaxy/managers/histories.py:925-943`) pre-seeds
   `state_counts` from `model.Dataset.states.values()` and then does
   `state_counts[hda.state] = state_counts[hda.state] + 1` (`:942`). `serialize_state_ids`
   (`:907-922`) does the same with `state_ids[hda.state].append(...)` (`:921`). Neither is a
   `defaultdict`. A history containing one `finishing` dataset raises `KeyError: 'finishing'`.
2. **The history reads as `error`.** `serialize_history_state`
   (`lib/galaxy/managers/histories.py:946-975`) is an if/elif chain that **defaults to
   `states.ERROR`** (`:953`) and has no `finishing` branch. A history whose only non-`ok` dataset is
   `finishing` falls through `RUNNING`/`QUEUED`/`ERROR`/`OK` and comes out `error`. This is almost
   certainly why `DatasetPopulator.wait_for_history(..., assert_ok=True)`
   (`lib/galaxy_test/base/populators.py:749-757` → `wait_on_state`) fails: the populators change adds
   `"finishing"` to `skip_states`, which covers the *job* state wait
   (`wait_for_job`, `:793-800`) but does nothing for the history wait, which sees `error`.
3. **Response-model validation failure.** `/api/histories/{id}/contents` declares
   `AnyHistoryContentItem` as its response model
   (`lib/galaxy/webapps/galaxy/api/history_contents.py:418-460,516-560`), and `HDACommon.state` is
   `DatasetStateField` (`lib/galaxy/schema/schema.py:718`). FastAPI validates the response, so
   `finishing` raises `ResponseValidationError` → 500 on any path that survives (1).
4. **Client-side.** `NON_TERMINAL_DATASET_STATES` (`client/src/api/datasets.ts:166`) does not include
   `finishing`, so the history panel would treat such a dataset as terminal and stop polling; and
   `$galaxy-state-border` / `$galaxy-state-bg` (`client/src/style/scss/base.scss:130-157`) have no
   entry, so it renders unstyled.

The window this is live for is the whole duration of the synchronous
`set_job_metadata.delay(...).get()` — minutes on large outputs, not milliseconds.

**Suggested direction.** Galaxy already has a dataset-level state for exactly this moment:
`Dataset.states.SETTING_METADATA` (`lib/galaxy/schema/schema.py:93`), used by
`lib/galaxy/tools/actions/metadata.py:203` and `lib/galaxy/tools/__init__.py:3489`, cleared by
`set_metadata_success_state()` in the celery task itself
(`lib/galaxy/celery/tasks.py:214-215`). Options, roughly in order of how much I'd prefer them:

- **(a)** Don't route `FINISHING` through `change_state`. Set `job.state` (via `job.set_state`) and
  commit, without calling `update_output_states`. The job-level marker is all the recovery path
  needs; the outputs' state is irrelevant during the metadata window and is about to be rewritten by
  `job_wrapper.finish` anyway. Smallest diff, kills all four consequences.
- **(b)** Keep `change_state` but teach `update_output_states` to map job states with no dataset
  counterpart onto `SETTING_METADATA`. Slightly larger, and arguably the more honest UI (the history
  would show "setting metadata", which is what is actually happening), but it makes a job-state
  concern leak into the model layer.
- **(c)** Add `finishing` to `DatasetState` too, plus `base.scss`, `NON_TERMINAL_DATASET_STATES`,
  `serialize_history_state`, and `useInvocationGraph.ts`. Most work, and it duplicates
  `SETTING_METADATA` for no gain.

I'd take (a). Whichever is chosen, the fix is not "add `finishing` to more lists" — it is to stop the
job state from being copied onto datasets in the first place.

### P1-2 — The marker is set for eight runners; only Pulsar can recover from it

**Where:** `lib/galaxy/jobs/runners/__init__.py:444,465`, `lib/galaxy/managers/jobs.py:2079-2081`,
`lib/galaxy/jobs/handler.py:360-363`.

`_handle_metadata_externally` is not Pulsar-specific. It is called from eight runners:

```
lib/galaxy/jobs/runners/pulsar.py:757
lib/galaxy/jobs/runners/local.py:203
lib/galaxy/jobs/runners/condor.py:241,279
lib/galaxy/jobs/runners/kubernetes.py:1145
lib/galaxy/jobs/runners/cli.py:216
lib/galaxy/jobs/runners/tasks.py:134
lib/galaxy/jobs/runners/drmaa.py:276
```

All eight now set `FINISHING`. `get_jobs_to_check_at_startup` now returns those jobs, and
`JobHandlerQueue._check_job_at_startup` sends them to `self.dispatcher.recover(job, job_wrapper)`
(`lib/galaxy/jobs/handler.py:360-363`, the `else:` branch, which is where a job with a runner name
*and* an external id lands). But:

- `DRMAAJobRunner.recover` (`lib/galaxy/jobs/runners/drmaa.py:420-446`) is
  `if job.state in (RUNNING, STOPPED): ... elif job.get_state() == QUEUED: ...` — a `FINISHING` job
  falls off the end and **nothing happens**.
- `KubernetesJobRunner.recover` (`lib/galaxy/jobs/runners/kubernetes.py:1053-1084`) — same shape,
  same silent no-op.
- `ShellJobRunner.recover` (`lib/galaxy/jobs/runners/cli.py:279`) and
  `CondorJobRunner.recover` (`lib/galaxy/jobs/runners/condor.py:296`) — same `RUNNING/STOPPED` +
  `QUEUED` shape.
- `LocalJobRunner.recover` (`lib/galaxy/jobs/runners/local.py:180-184`) unconditionally errors the
  job, which is at least honest.

So on those runners a job that was mid-metadata at restart is now left in `FINISHING` **forever**: it
is not terminal (`is_terminal` excludes it, correctly), so any invocation waiting on it never
completes, and nothing will ever pick it up again on a subsequent restart either — `recover` will
no-op again.

This is a **regression**, not merely an unimplemented case. Before this PR the job would have still
been in `RUNNING` at restart, and `drmaa.recover` would have put it back on the monitor queue. The
PR takes a recoverable situation and makes it unrecoverable for every non-Pulsar runner.

**Fix:** either set the marker only on the Pulsar path (move the `change_state` call out of the
shared method and into `pulsar.py`, or gate it), or — better, since the underlying hazard is
identical for all of them — give `BaseJobRunner` a default `FINISHING` handling and have each
`recover()` inherit it. `BaseJobRunner.recover` is currently `raise NotImplementedError()`
(`lib/galaxy/jobs/runners/__init__.py:329-330`), so there is a natural place to put shared recovery
logic that does not exist yet. That would be the reusable abstraction this PR is one line away from
leaving behind.

### P1-3 — `client/src/api/schema/schema.ts` was not regenerated

`client/src/api/schema/schema.ts:17623-17638` still lists the JobState union without `"finishing"`.
`.github/workflows/lint_openapi_schema.yml` runs `make update-client-api-schema` and then fails if
`git status --porcelain` is non-empty — which is precisely the two `Validate OpenAPI schema` FAILURE
checks on this PR. Mechanical: run `make update-client-api-schema` and commit.

### P2-1 — The Pulsar recovery re-runs `finish_job` against a remote job that has already been cleaned up

**Where:** `lib/galaxy/jobs/runners/pulsar.py:697-770` (`finish_job`), `:840-842` (the new `recover`
branch), `lib/galaxy/jobs/runners/__init__.py:989-990` (`mark_as_finished`).

The ordering inside `PulsarJobRunner.finish_job` matters:

```
:742   failed = pulsar_finish_job(**finish_args)     # stage outputs back, then clean remote job
:756   if not PulsarJobRunner.__remote_metadata(client):
:757       self._handle_metadata_externally(...)      # <-- FINISHING is set in here
:761   job_wrapper.finish(...)
```

`pulsar_finish_job` is `pulsar.client.staging.down.finish_job`, whose body is
`results_stager.collect()` followed by `_clean(collection_failure_exceptions, cleanup_job, client)` —
i.e. with the default `cleanup_job` it **deletes the remote job directory** on success. So by the
time `FINISHING` is set, the outputs are already local and the Pulsar-side job is gone.

`recover()` responds to `FINISHING` with `self.mark_as_finished(job_state)`, which just puts
`(self.finish_job, job_state)` on the work queue — the *whole* `finish_job`, from the top. On the
second pass `client.full_status()` queries a job Pulsar no longer has, and `pulsar_finish_job` tries
to re-download outputs that are no longer there. The likely outcome is
`job_wrapper.fail("Failed to find or download one or more job outputs from remote server.")`
(`:743-746`) or the `except` at `:747-750` → `fail_job(GENERIC_REMOTE_ERROR)`. In other words the
recovery path plausibly **fails the job it is meant to rescue**.

What the recovery actually needs to redo is the tail: re-run the metadata task and call
`job_wrapper.finish(...)`. That is a narrower entry point than `finish_job`, and it does not exist
yet — worth extracting rather than reusing `mark_as_finished`.

Two smaller notes in the same area:

- The `FINISHING` marker only makes sense for the `"celery" in metadata_strategy` branch, but the
  `change_state` call is placed such that it is skipped for the `else` branch
  (`lib/galaxy/jobs/runners/__init__.py:477-500`) — the blocking `subprocess.call` path, which is the
  *longer* of the two and equally exposed to a handler restart. If the marker is worth having, it is
  worth having for both branches; if it isn't, the placement should say why.
- `FINISHING` is set but nothing clears it on the failure path: if `set_job_metadata` raises, the
  `except` at `:471-474` logs and `return`s, leaving the job in `FINISHING` with no further
  transition until a restart.

### P2-2 — Handler reassignment is uncommitted and reimplements an existing mechanism

**Where:** `lib/galaxy/jobs/runners/pulsar.py:1105-1106`.

```python
job, job_wrapper = self.app.job_manager.job_handler.job_queue.job_pair_for_id(galaxy_job_id)
if full_status["status"] in ("complete", "cancelled"):
    job.handler = self.app.config.server_name
```

Three concerns:

1. **Nothing commits it here.** `job_pair_for_id` (`lib/galaxy/jobs/handler.py:301-304`) loads the
   `Job` from the message consumer's scoped session. `_update_job_state_for_status` then calls
   `mark_as_finished`, which hands the work to a *different thread* with its own session
   (`lib/galaxy/jobs/runners/__init__.py:989-990`). The attribute change survives only if something
   later happens to flush that consumer session. Compare `lib/galaxy/celery/tasks.py:249-253`, which
   sets `job.handler` and then explicitly drives a commit. This wants an explicit commit.
2. **Galaxy already has a transactional "claim this job for me" primitive.** `JobHandlerQueue`'s grab
   query (`lib/galaxy/jobs/handler.py:150-168`) is exactly
   `UPDATE job SET handler = :server_name WHERE id IN (...)`, with `FOR UPDATE SKIP LOCKED` /
   `SERIALIZABLE` variants per `handler_assignment_method`. Assigning the attribute in Python
   sidesteps all of that and races with whichever handler currently owns the row.
3. **It is unconditional.** It steals the job even when the assigned handler is alive and healthy and
   would have handled the message itself. That may well be intended (the message arrived *here*, so
   *here* should own it), but it deserves a comment, or a guard on
   `job.handler != self.app.config.server_name`.

### P2-3 — The "existing test coverage" claim does not hold, and the one test-file change is a workaround

The PR checks "This is a refactoring of components with existing test coverage." It is not a
refactoring — it adds a state to a state machine — and the coverage does not exist:

- Nothing in `test/unit/app/jobs/` tests any runner's `recover()`. There is no
  `test_runner_pulsar.py` at all.
- `test/integration/test_job_recovery.py` is the natural home. It already restarts Galaxy mid-job
  (`self.restart(handle_reconfig=...)`) and asserts the history comes back ok, so a third class that
  restarts while a job is in `FINISHING` is a small addition. It would need the celery metadata
  strategy configured — `test/integration/test_celery_tasks.py` shows that setup.
- The only test-facing change, `lib/galaxy_test/base/populators.py:4198`, adds `"finishing"` to
  `wait_on_state`'s `skip_states`. That is not coverage — it is the test harness being taught to
  tolerate the new state, and (per P1-1) it does not even fully do that, since the *history* wait
  sees `error` rather than `finishing`. Its presence is evidence the author hit the leak in practice
  and papered over the job-state half of it.

Given how much of CI is red, I would not merge on any test claim until the shards are green.

### P3-1 — Predicates and client enums that enumerate states and now have a hole

None of these are breaking, but they are the places a reviewer would want touched alongside a new
state:

- `HistoryExport.preparing` (`lib/galaxy/model/__init__.py:3074-3075`) is
  `[RUNNING, QUEUED, WAITING]` — a history-export job in `FINISHING` is now neither `ready` nor
  `preparing`.
- `client/src/composables/useInvocationGraph.ts:27-39` — the `GraphStep["state"]` union;
  `:69-71` — `SINGLE_INSTANCE_STATES` / `ALL_INSTANCES_STATES`. A step whose job is `finishing`
  returns `undefined` from `getStepStateFromJobStates` (`:288-303`) and falls through.
- `client/src/style/scss/base.scss:130-157` — no border/bg entry.

`ItemStateSummary.states` is `dict[JobState, int]` (`lib/galaxy/schema/schema.py:2187-2189`), so the
job-state histogram picks up the new key for free on the Python side — but not in `schema.ts` until
P1-3 is fixed.

### P3-2 — Naming: `FINISHING` vs. the existing `SETTING_METADATA` vocabulary

`Dataset.states.SETTING_METADATA` already names this exact phase of a job's life, and the celery task
that the new state brackets is literally `set_job_metadata`. Introducing a second, differently-named
concept for the same window means the job side and the dataset side of the same moment now have
unrelated names. Worth at least a sentence in the PR body on why `FINISHING` is the better name —
"finishing" is broader than metadata (it would also cover the `job_wrapper.finish` output collection),
which may be deliberate, but the diff only ever sets it around metadata.

### P3-3 — Staleness

Head is 5.5 months old (2026-03-12); the branch point `d77ed6e740` is a March merge of
`release_26.0`. The six touched files have moved ~2,900 lines on `dev` since, though GitHub still
reports the PR mergeable. I diffed the specific regions against `FETCH_HEAD` (`8bd272a050`):
`get_jobs_to_check_at_startup`, the `JobState` enum, `_handle_metadata_externally`, and
`PulsarJobRunner.recover` are all substantively unchanged upstream, so **every finding above is
live** — nothing here has been fixed on `dev` in the interim. (`_handle_metadata_externally` picked
up an `assert set_metadata_tool is not None` in the non-celery branch upstream; unrelated.)

Also worth resolving before more work: mvdbeek's 2026-05-22 comment says he has work to make this a
celery chord, "a little larger than what I'd push through to 26.1." A chord would make the
`.get()`-blocks-the-handler problem go away structurally rather than by marking state around it. The
two approaches want reconciling — this PR's `FINISHING` may be the right stopgap, but that should be
an explicit decision.

---

## Act before merge

1. **P1-1** — stop `FINISHING` reaching `dataset.state`. This is the one that has to be settled first;
   the red API/Integration/Selenium/Playwright shards are almost certainly all downstream of it.
2. **P1-2** — either scope the marker to Pulsar or give the other seven runners a recovery path.
   Leaving DRMAA/k8s/condor/cli jobs wedged in `FINISHING` is worse than the bug being fixed.
3. **P1-3** — `make update-client-api-schema` and commit.
4. **P2-1** — decide what `recover()` should actually re-run. `mark_as_finished` re-enters
   `finish_job` from the top against a cleaned-up remote job.
5. **P2-2** — commit the handler write, and say (in a comment) why it is unconditional.
6. Get CI green before any of this is read as ready. Every functional shard is red today.

## Follow-ups, not this PR

- P2-3 — a `test/integration/test_job_recovery.py` case that restarts while a job is in `FINISHING`.
  Also, there is no unit coverage of any runner's `recover()` anywhere; a `test_runner_pulsar.py`
  would be worth having independently.
- P3-1 — the client-side enums and the `HistoryExport.preparing` hole.
- P3-2 — reconcile the `FINISHING` / `SETTING_METADATA` vocabulary.
- Extracting a shared `BaseJobRunner` recovery hook (see P1-2) — the abstraction this change wants
  and doesn't leave behind.

---

## Verified empirically vs. reasoned statically

**Not run:** no Galaxy test suite, no venv bootstrap, no pytest — per the review constraints. Nothing
was posted to GitHub; `gh pr view` (read-only) only. The worktree is unmodified, HEAD still at
`6e1e224e8a`.

**Read directly and quoted above:** `change_state` / `update_output_states` (the state-propagation
chain in P1-1), `serialize_state_counts` / `serialize_state_ids` / `serialize_history_state`, the
`DatasetState` and `JobState` enums, `DatasetStateField`, `HDACommon.state`, all eight
`_handle_metadata_externally` call sites, all six runner `recover()` implementations,
`PulsarJobRunner.finish_job` in full, `pulsar.client.staging.down.finish_job` (from the pulsar wheel
in a sibling worktree's venv, `pr/22781/.venv/.../pulsar/client/staging/down.py:17-30`, confirming
`_clean` runs after collection), `mark_as_finished`, `JobHandlerQueue._check_job_at_startup` and the
handler grab query, `wait_on_state` and its callers, and the four client files.

**Inferred rather than observed:** the causal link from P1-1 to the specific red shards. The CI runs
are from 2026-03-12 and their logs have aged out, so I could not read a traceback. The chain
(`finishing` on `dataset.state` → `KeyError` in `serialize_state_counts`, and → `error` from
`serialize_history_state` → `wait_for_history(assert_ok=True)` fails) is established from the code,
and the breadth of the failures (every shard that runs real jobs; nothing that doesn't) fits it, but
one actual run would confirm it. The `Validate OpenAPI schema` failures are not inferred — the
workflow's own `Check for changes` step and the stale `schema.ts` are conclusive.

**Also inferred:** that `pulsar_finish_job` on the recovery pass would fail rather than succeed
(P2-1). `_clean` deleting the remote job depends on the destination's `cleanup_job` setting; an
`onsuccess`/`never` destination would behave differently. The point stands for the default.
