# Pulsar #354 — Losing jobs on restart while postprocessing (OPEN)

Plan + supporting findings for fixing
[pulsar#354](https://github.com/galaxyproject/pulsar/issues/354), driven by the
docker-compose resilience framework that landed with
[pulsar#448](https://github.com/galaxyproject/pulsar/pull/448).

Related: [pulsar#371](https://github.com/galaxyproject/pulsar/issues/371) (closed
COMPLETED 2025-02-28, asked for exactly the index this plan adds, never got it),
[pulsar#393](https://github.com/galaxyproject/pulsar/issues/393) (overlapping
symptoms, different root cause).

All line numbers below are against `origin/master` at `3e455c8`.

## 1. Findings: what #448 did and did not fix

### #354 — not fixed by #448

#448 never touched `pulsar/managers/stateful.py`, and the mechanism Nate
described in the issue is still verbatim on master:

- `__handle_terminal_status` (`stateful.py:312`) calls `__deactivate(job_id)`
  and *then* `__handle_postprocessing`. That ordering dates to `252def2`
  (2014-06-18) and has never changed. Between those two calls the job is in
  **no** persistent index.
- `recover_active_jobs` (`stateful.py:358`) walks only `-preprocessing-jobs/`
  and `-active-jobs/` (`ACTIVE_STATUS_PREPROCESSING`, `ACTIVE_STATUS_LAUNCHED`).
  There is no `-postprocessing-jobs/`; `ActiveJobs._active_job_directory`
  (`stateful.py:468`) raises on any other status.

The outbox from #448 is the wrong shape for this bug: it persists the
*message*, not the *work*. A kill during postprocess never reaches
`__state_change_callback`, so nothing is ever enqueued and nothing replays.

**Docs overstate the coverage.** `docs/error_handling.rst:362` lists the covered
case as "Pulsar SIGKILL after final_status, before publish → outbox replay on
restart". But `final_status` is written *before* postprocess starts
(`stateful.py:190`), so that window as phrased is the whole of #354. The test
that nominally covers it, `test_a3_sigkill_after_final_status_before_publish`,
actually waits for the terminal status to be **delivered** before killing — it
is a no-duplicate test, not an LP1 test. Its docstring and that doc row both
need correcting.

Partial mitigation that does exist, but not from #448: `__postprocessing_pending`
(`stateful.py:305`, added by `c9067e7`, 2026-08-18) makes a *polled* status read
return `postprocessing` rather than `complete` for a job with `final_status` and
no `postprocessed`. Only helps the REST-polling path — after an MQ-mode restart
nothing polls the job, because it is in no index.

### #393 — partially fixed by #448

Recorded here because the two issues get conflated.

- The **opening report** (job `66751002`) is LP1's exact shape. Pre-#448,
  `__state_change_callback` was the last unguarded statement in
  `do_postprocess`, so a publish exception killed the thread, `final_status` sat
  on disk, and nothing re-emitted. `outbox.enqueue` now persists before
  publishing and is coded and documented never to raise
  (`pulsar/messaging/outbox.py:108-138`), with a drain thread plus a startup
  drain. On by default whenever `persistence_directory` is set
  (`outbox.py:225-252`), so production MQ deployments get it without config.
  Caveat: the total log silence after `collecting output database.dmnd` fits a
  hung or killed process just as well as a failed publish, and that reading
  lands back in #354.
- **2025-05-01 comment** — preprocess failed, `failed` was *successfully*
  published (`Published to key` is in the log), Galaxy didn't act.
  Publisher-side hardening cannot reach this; galaxy#9911 is the real fix.
- **2025-06-12 comment** — pycurl connection reset exhausting the staging retry
  budget, "no way to recover other than restarting". #448 touched no
  staging-retry code. `28fa4ed` later went the opposite direction (skip retries
  for permanent HTTP errors).
- The leftover `-preprocessing-jobs` entry from the 2025-05-01 case is already
  handled, but by `b462c34` (2018), not #448.

Deployment note: #448's F2 durability defaults to **false**, and F5's bounded
retry defaults only apply when `amqp_publish_retry` is already set. F1 (the
outbox) is the only piece that is free.

## 2. Why the #448 harness fits #354 specifically

`docs/error_handling.rst:263` warns that `queued_python` "cannot survive a
Pulsar SIGKILL", which is why `test_a2_sigkill_during_execution` can only assert
`expected=None`. **That caveat does not apply to #354**: by the time the bug
window opens the job process has already exited and `final_status` is on disk.
Nothing needs to survive the kill except Pulsar's own bookkeeping. So the
assertion can be a hard `expected="complete"`, not `await_any_terminal`.

Second piece of luck: toxiproxy already fronts mock-galaxy as `galaxy_http`
(`test/resilience/config/toxiproxy.json`), and
`job_factory.make_setup_message(output_files=...)` already emits
`remote_transfer` postprocess actions pointed at `http://toxiproxy:8088`. Stage-out
is already fault-injectable — `test_c1` in `test_galaxy_outage.py` does
`galaxy_proxy.add_latency(1000)` on the input side today. Stalling stage-out is
the same move on the other end.

### Reuse inventory

| Need | Already exists | Source |
|---|---|---|
| Kill Pulsar mid-phase, restart, wait until re-consuming | `PulsarControl.kill()` / `.start(wait_ready=True)` | `pulsar/testing/resilience/pulsar_control.py` |
| Stall stage-out deterministically | `ToxiproxyControl.add_latency` / `disable` / `reset_peer` on the `galaxy_proxy` fixture | `pulsar/testing/resilience/broker_control.py`, `test/resilience/conftest.py:163` |
| Job with real staged outputs | `make_setup_message(output_files=[...])` | `pulsar/testing/resilience/job_factory.py` |
| Terminal-status oracle | `await_terminal`, `assert_exactly_once_terminal`, `assert_states_in_order` | `pulsar/testing/resilience/assertions.py` |
| Verify the output actually landed | GET `…/files/?path=/galaxy/files/<name>&file_type=output` | simple-job-files mount, `test/resilience/mock_galaxy/app.py:92` |
| Preserve state across kill/restart | `pulsar` fixture wipes at fixture entry only, by design | `test/resilience/conftest.py` |
| Run in CI | resilience suite already wired | `263ab01f` |
| Unit-level seam holding postprocess open | **`_postprocessing_held()`** | `test/stateful_test.py:214` |

That last one is the sleeper — `stateful_test.py` already has a context manager
that blocks inside `postprocess`, so the unit-level red tests are nearly free.

### Harness additions needed (both generalizations of existing code)

1. `PulsarControl.wait_for_log(marker, timeout)` — hoist the
   `_docker_compose("logs", "--since", …)` scrape out of `wait_until_consuming`
   so a scenario can block until `collecting output` appears. This is what makes
   "kill *during* postprocess" deterministic rather than `time.sleep`-and-hope.
2. A `job_factory` helper for a chunky output
   (`head -c 20000000 /dev/urandom > out1`), widening the stall window.

## 3. Phase 0 — red, unit level (`test/stateful_test.py`)

Fast, no docker, rides the normal suite. Write first; all three fail on master.
Reuse `_ScriptedStatusManager`, `_RecordingStatefulManagerProxy`, `_proxy()`,
`_launched_job()` verbatim.

- `test_postprocessing_job_is_tracked_as_active` — under `_postprocessing_held()`,
  assert `<persistence>/<manager>-postprocessing-jobs/<job_id>` exists; assert it
  is gone once the thread finishes. **Red: directory does not exist.**
- `test_recover_active_jobs_redrives_interrupted_postprocessing` — hand-build a
  job dir with `preprocessed`, `final_status=complete`, no `postprocessed`, plus
  a postprocessing index entry; construct a fresh proxy; call
  `recover_active_jobs()`; assert `postprocess` ran and the callback fired
  `complete`. **Red: no such loop.**
- `test_interrupted_postprocessing_is_not_reported_lost` — same fixture, assert
  the recovery path does not emit `lost`.

## 4. Phase 1 — production change (`pulsar/managers/stateful.py`)

1. Add `ACTIVE_STATUS_POSTPROCESSING = "postprocessing"`. Create the third
   directory in `ActiveJobs.__init__` and add a branch to
   `_active_job_directory` (`stateful.py:468` currently raises on anything else).
   This is literally what #371 asked for.

2. `__handle_terminal_status` (`stateful.py:312`) — **activate the postprocessing
   entry before `__deactivate`**, not after:

   ```python
   if proxy_status in POSTPROCESSED_STATUSES:
       self.active_jobs.activate_job(job_id, active_status=ACTIVE_STATUS_POSTPROCESSING)
   self.__deactivate(job_id)
   if proxy_status in POSTPROCESSED_STATUSES:
       self.__handle_postprocessing(job_id, proxy_status)
   ```

   Ordering is the whole fix. A crash at any instant must leave the job in *at
   least one* index, never zero. Today there is a window where it is in neither,
   and that window is the entire postprocess.

3. `do_postprocess` — deactivate the postprocessing entry in a `finally`, after
   `__state_change_callback`. Callback first hands the outbox the terminal
   message, shrinking the crash window to "enqueued but index not yet cleared".

4. `recover_active_jobs` (`stateful.py:358`) — new loop over
   `ACTIVE_STATUS_POSTPROCESSING` ids: read `final_status` off disk, re-drive
   `__handle_postprocessing`. Must run before the monitor starts, which #496
   (`53787d9`, "Defer manager monitoring until after job recovery") already
   guarantees — free correctness, no new ordering constraint.

**Deliberately not touching** `postprocess()`'s
`finally: job_directory.write_file("postprocessed", "")`
(`pulsar/managers/staging/post.py:45`). That marker is written even when
stage-out fails, so it cannot drive recovery — but changing it would alter
`__postprocessing_pending`'s meaning and therefore what `get_status` reports for
a genuinely-failed postprocess. Drive recovery purely off the index entry, which
the thread's `finally` clears, and leave the marker semantics alone. It is
suspicious; see the open questions.

## 5. Phase 2 — integration scenarios

New file `test/resilience/scenarios/test_postprocess_restart.py`, marked
`@pytest.mark.resilience`; picks up the `mq_mode` matrix automatically via
`pytest_generate_tests`.

**`test_a5_sigkill_during_postprocess_stage_out`** — the headline test:

```python
galaxy_proxy.add_latency(5000)              # stall stage-out, don't fail it
# submit job with output_files=[("out1", "a5_out1")]
pulsar.wait_for_log("collecting output")    # deterministically inside postprocess
pulsar.kill()
galaxy_proxy.remove_all_toxics()
pulsar.start(wait_ready=True)
await_terminal(job_id, expected="complete", timeout=90)
assert_exactly_once_terminal(job_id, expected="complete")
# assert output readable from mock-galaxy at /galaxy/files/a5_out1
```

On master this hangs until `await_terminal` times out — exactly Nate's ghost job.

Latency rather than `disable()` matters: `RetryActionExecutor`'s default
`max_retries = -1` means **no retry** (`pulsar/managers/util/retry.py:7`), so a
disabled proxy fails postprocess instantly instead of holding it open.

- **`test_a6_sigterm_during_postprocess_drains`** — same setup, `pulsar.sigterm()`.
  `new_thread_for_job(..., daemon=False)` suggests a clean shutdown already joins
  the postprocess thread; pin that as intended rather than accidental.
- **`test_a7_output_content_survives_restart`** — assert the recovered upload's
  bytes match, catching a truncated or wrongly-resumed transfer rather than just
  "a file exists".
- **`test_a8_postprocess_restart_under_broker_outage`** — compose with
  `rabbitmq_proxy.disable()` so recovery and the outbox interact; guards against
  the recovered terminal update being lost a second way.

## 6. Phase 3 — docs

- Fix `docs/error_handling.rst:362` — the row currently reads as a claim that
  #354 is covered.
- Fix `test_a3`'s docstring to describe what it actually tests (no duplicate
  after delivery).
- Add a section 6 subsection describing the new `-postprocessing-jobs/` index
  alongside the two existing ones.

## 7. Sequencing

Phase 0 red → Phase 1 → Phase 0 green → Phase 2 (verify `a5` red by stashing
Phase 1, then green) → Phase 3.

Phase 2 needs the stack up:

```sh
docker compose -f test/resilience/docker-compose.yml up -d --build
pytest test/resilience/scenarios/test_postprocess_restart.py -v
```

Baseline for the normal suite on macOS is **44 pre-existing environmental
failures** (40 `integration_test.py`, 1 each in `manager_coexecution_test.py`,
`manager_queued_test.py`, `manager_test.py`, `wsgi_app_test.py` — the
`/usr/bin/cow` family). Anything beyond that is real.

## 8. Gotchas

- **Re-running postprocess re-POSTs outputs.** `mock_galaxy/app.py:91` sets
  `allow_multiple_downloads=True` for the GET side only. Whether simple-job-files
  refuses a duplicate *upload* to the same path needs checking first — and real
  Galaxy's behaviour here matters more than the mock's.
- **At-least-once is the contract, not exactly-once.** A crash between the outbox
  enqueue and clearing the index yields one duplicate terminal message. #448
  already establishes that receivers must dedupe
  (`docs/error_handling.rst:78`), so this is consistent — but `test_a8` may need
  `await_terminal` plus an explicit dedupe assertion rather than
  `assert_exactly_once_terminal`.
- **`PulsarControl._wipe_state()` drops both volumes**, so any scenario needing
  pre-seeded persisted state must build it in-test, not in a fixture.
- Relay mode adds `_wait_relay_setup_waiters_drained` on stop but AMQP mode does
  not. If `a6` proves flaky in one mode only, that asymmetry in
  `PulsarControl._after_stopped` is the first place to look.

## 9. Open questions

1. Re-drive postprocess on recovery unconditionally, or skip when `postprocessed`
   exists? (Latter avoids duplicate uploads; former handles partial stage-out.)
2. Does real Galaxy's job-files API accept a duplicate output POST? Determines
   whether re-drive is safe at all.
3. Duplicate terminal message acceptable, or add a `status_published` marker to
   suppress it?
4. `postprocess()` writing `postprocessed` in `finally` even on failure —
   separate issue, or fold in?
5. Scope: #354 only, or also close #371 in the same PR?
6. Should `a5` run the full three-mode matrix, or pin to `amqp` to keep suite
   runtime down?

## 10. Progress (2026-09-24) — implemented on `postprocess-restart-recovery`

Branch `jmchilton/pulsar:postprocess-restart-recovery`, two commits off
`origin/master` at `3e455c8`. **Not opened as a PR.**

- `dc7b4cd` — resilience harness fixes (prerequisites, see below)
- `879747f` — the #354 fix, tests, docs

Phases 0-3 are done as planned. Deviations and new findings:

### Three harness defects had to be fixed first

None of these were known when the plan was written; all three blocked Phase 2.

1. **`job_factory`'s `output_files` never staged anything.** It emitted
   `remote_staging["postprocess"]` actions, a key nothing reads — `postprocess()`
   builds output actions itself from `client_outputs` plus the action mapper's
   `files_endpoint`. No existing scenario passed `output_files`, so stage-out
   had never been exercised by the suite at all. Now populates `client_outputs`
   and takes one name per output (`has_output_file` matches the client path
   against the outputs directory by basename, so the two sides cannot differ).
2. **mock-galaxy's AMQP consumer died silently and never reconnected.** The
   inner drain loop swallowed *every* exception, so a dropped connection spun
   forever on a dead socket. The recorder then saw no status updates for the
   rest of the session and every scenario failed with `last events: []`. This
   contaminated the first red run — the fix had to be re-verified against a
   healthy recorder. Only the idle timeout is swallowed now.
3. **`docker compose logs --since <window>` misses lines written inside the
   window.** Replaced the planned `wait_for_log` with
   `PulsarControl.watch_logs()` → `LogWatch.wait_for(marker)`, which diffs
   against a baseline captured when the watch opens.

### Scenario shape differs from the plan

- **`a7` folded into `a5`.** Byte-exactness is asserted by `a5` itself; a
  separate restart cycle bought nothing.
- **The stall needs a slow job, not just a slow proxy.** The `galaxy_http`
  toxic is also how the test process reaches mock-galaxy, so the latency
  delays `_publish_setup` too. Without a `sleep` in the job, Pulsar finishes
  stage-out while the submitting call is still blocked. Jobs now
  `sleep 12` against an 8 s latency, and the log watch opens before the publish.
- **`a8` pinned to `amqp`;** `a5`/`a6` run the full three-mode matrix
  (open question 6 → full matrix for the headline test).

### Open questions, resolved

1. **Re-drive unconditionally.** The conditional alternative would have to
   re-send `final_status` when `postprocessed` exists, but that marker is
   written even when staging *failed*, so it could report `complete` for a job
   whose outputs never arrived.
2. **Duplicate uploads are fine**, at least against simple-job-files: `_post`
   overwrites unconditionally. Real Galaxy's job-files POST is the same shape.
   Still worth a second opinion before release.
3. Not hit — no duplicate terminal was ever observed; `assert_exactly_once_terminal`
   holds in all three modes.
4. **Left alone**, as planned. Still suspicious; still wants its own issue.
5. **#354 only.** #371 asked for this index and is already closed COMPLETED;
   worth a comment rather than a scope increase.
6. See above.

### Verification

- `test/stateful_test.py`: 11 passed. All three new tests red on master
  (`AttributeError: no attribute 'ACTIVE_STATUS_POSTPROCESSING'`).
- Unit suite: 44 failed / 325 passed / 92 skipped. Baseline on master in the
  same worktree: 44 failed / 322 passed / 85 skipped — identical failure set
  (`diff` of the `FAILED` lines is empty), +3 new tests.
- `a5[mode=amqp]` red on master with a healthy recorder: job reaches `running`,
  then nothing — the ghost job, exactly as reported.
- New scenarios: 7 passed (a5/a6 × 3 modes, a8 × amqp).
- Full resilience suite: **63 passed, 3 skipped** (the 3 skips are the
  pre-existing `test_c4`).
- `ruff`, `isort`, `mypy` clean.

### Review round (`087a9fd`)

Subagent review found four defects, all fixed and pushed.

- **Double recovery.** The overlap window this fix deliberately creates
  (postprocessing entry written before the launched entry is cleared) left a
  job in *both* indices on a kill. Recovery postprocessed it *and* handed it to
  the runner — `queued_python` re-executes the tool. The launched entry also
  survived forever, since `__handle_terminal_status` can never re-fire once
  `final_status` is on disk, so the monitor polled it and every later restart
  re-ran it again. Recovery now clears the launched entry as part of resuming
  postprocessing, and skips any launched job that already has `final_status`.
  That second half also closes a **pre-existing** window between recording the
  terminal status and indexing it, where a requeue would equally have re-run
  the tool. Two new unit tests, both red before the fix.
- **Stale-file assertions.** Nothing wipes the `galaxy-files` volume between
  tests — `_wipe_state` drops only the two pulsar volumes. With fixed output
  names, an output staged by an earlier mode or session could satisfy the
  byte-exact assertion. Names are now unique per run. (They still pass, so the
  earlier greens were real, not artifacts.)
- **`GALAXY_HOST_URL` was a false premise.** There is no host-side bypass of
  toxiproxy for mock-galaxy — only the relay publishes a second port.
  `localhost:8088` *is* toxiproxy. Constant and `files_url(base=...)` removed.
- **Docs overclaimed the invariant.** "Entered in the next index before removed
  from the previous" is not true at the preprocessing→launched handoff: the
  preprocessing entry is dropped before the job is submitted, so a kill between
  submission and the `-active-jobs/` write leaves a *running* job in no index.
  Docs now say what is true and name the remaining gap.

Re-verified after: unit suite 44 failed / 327 passed / 92 skipped (identical
failure set to master), full resilience suite 63 passed / 3 skipped,
`ruff`/`isort`/`mypy` clean.

**The preprocessing→launched gap is a real, unfixed bug of the same family as
#354.** Not fixed here because activating the launched entry before `launch()`
would index a job that may never start. Wants its own issue.

### Still open

- PR not opened; needs explicit go-ahead.
- Docker Desktop was started during this work and the compose stack is still
  up (`--keep-stack`); tear down with
  `docker compose -f test/resilience/docker-compose.yml down -v`.
