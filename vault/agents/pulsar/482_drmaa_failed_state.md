# PR 482 — Fix DRMAA FAILED job state reported as COMPLETE

**Repo:** galaxyproject/pulsar · **PR:** #482 · **Author:** gkr0110 · **Head:** `a5f227d9189a6851ba6392bc4ee12dc137050f90` · **Base:** `master`

The diagnosis is correct and the constant is correct, but the fix is incomplete in a way
that makes it a regression for the deployment shape it was written for. `BaseDrmaaManager`
now returns `status.FAILED` from `_get_status_external`, and `StatefulManagerProxy` — the
wrapper every real manager runs behind — has no terminal path for `FAILED` at all.
`pulsar/managers/stateful.py:197` hard-codes `[status.COMPLETE, status.CANCELLED]`, so the job is
never deactivated and the manager monitor polls it forever; and separately, the terminal
state-change callback is emitted only from inside the postprocessing path (`stateful.py:238`),
which runs only for `COMPLETE`, so **no failure notification is ever sent**. On the REST/polling
client the new status does reach Galaxy correctly; on `PulsarMQJobRunner` (which sets
`poll = False` and is push-only) it never reaches Galaxy at all, so the job hangs in `running`
instead of being wrongly marked `complete`. Verdict: **request changes** — the one-line diff
needs companion changes in `stateful.py`, one of which is a genuine design decision rather than a
list edit.

## The bug

`pulsar/managers/base/base_drmaa.py:37-50` maps DRMAA job states onto Pulsar's own status
vocabulary with an inline dict. Before this PR:

```python
JobState.DONE: status.COMPLETE,
JobState.FAILED: status.COMPLETE,  # Should be a FAILED state here as well
```

The comment is the original author admitting the mapping is wrong. `JobState.FAILED` in
DRMAA means the job finished but failed at the DRM level — rejected at submission,
terminated, walltime/memory limit exceeded. A job whose *command* exits non-zero is normally
`DONE` with a non-zero exit status, so `FAILED` is specifically the DRM-side failure class.

Collapsing it into `COMPLETE` means the job runs the normal completion path: `stateful.py:197`
stores `final_status = complete`, deactivates, postprocesses, and fires the callback with
`complete`. Galaxy's `_update_job_state_for_status` (galaxy `lib/galaxy/jobs/runners/pulsar.py:369`)
sees `"complete"` and calls `mark_as_finished`. The user gets a green job with no outputs.
That matches the author's reported reproduction (Slurm `CANCELLED` for a missing `--account`,
surfaced as `complete` with an empty output directory).

## The fix

One line, `pulsar/managers/base/base_drmaa.py:49`:

```python
JobState.FAILED: status.FAILED,
```

Verifying the mechanics of the constant itself:

- `FAILED = "failed"` is a real member of the vocabulary — `pulsar/managers/status.py:15`.
- It is imported: `from pulsar.managers import status` at `pulsar/managers/base/base_drmaa.py:9`,
  module top level. No import hygiene issue.
- `status.is_job_done()` (`pulsar/managers/status.py:23-27`) already includes `FAILED`, so
  `manager_endpoint_util.full_status()` (`pulsar/manager_endpoint_util.py:28`) still builds the
  full completion dict — stdout, stderr, return code, directory contents. The PR body's claim
  on this point is accurate.
- Galaxy handles `"failed"`: `lib/galaxy/jobs/runners/pulsar.py:377-382` routes it to
  `fail_job(..., message=FAILED_REMOTE_ERROR, full_status=full_status)`, and `fail_job`
  (`lib/galaxy/jobs/runners/__init__.py:600`) pulls `full_status["stdout"]`/`["stderr"]` into
  `job_wrapper.fail(...)`. So on the polling path the user gets a failed job with the tool
  output attached. That is a genuine improvement.

So the change is right as far as it goes. What it misses is the layer in between.

## Downstream consumers of the new state

Every manager runs wrapped in `StatefulManagerProxy` — the DRMAA manager's `get_status` is
reached only via `stateful.py:192`. The relevant block, `pulsar/managers/stateful.py:191-199`:

```python
proxy_status = self._proxied_manager.get_status(job_id)
if proxy_status == status.RUNNING:
    ...
elif proxy_status in [status.COMPLETE, status.CANCELLED]:
    job_directory.store_metadata(JOB_FILE_FINAL_STATUS, proxy_status)
    state_change = "to_complete"
```

`status.FAILED` is not in that list, and it has not been since the block was written
(`git blame`: `f71dcd1`, 2014-02-18). With this PR, a DRMAA-failed job therefore:

1. **Never stores `final_status`** (`stateful.py:198`), so `__proxy_status` re-queries DRMAA on
   every subsequent poll rather than short-circuiting at `stateful.py:189`.
2. **Never sets `state_change = "to_complete"`**, so `__deactivate` (`stateful.py:215`) is never
   called. The job stays in `active_jobs`, and `ManagerMonitor._monitor_active_jobs`
   (`stateful.py:380`) polls it on every iteration for the life of the process. The active-job
   file also persists on disk, so `recover_active_jobs` (`stateful.py:273`) re-registers it after
   a restart. This is an unbounded leak of both monitor work and persistence-directory entries.
3. **Never calls `_deactivate_job` on the proxied manager** (`stateful.py:217-222`), so
   `ExternalBaseManager._external_ids` (`external.py:66-67`) grows without bound. Worse for
   `ExternalDrmaaQueueManager`, whose `_deactivate_job` (`queued_external_drmaa.py:90-94`) is
   what clears `user_map` and `reclaimed`.
4. **Never fires `__state_change_callback`.** This is the serious one. `PulsarMQJobRunner` sets
   `poll = False` (galaxy `lib/galaxy/jobs/runners/pulsar.py:1123-1126`) and relies entirely on
   `__async_update` driven by the Pulsar status-update message. No callback means no message
   means the Galaxy job sits in `running` indefinitely. Pulsar+Slurm via `queued_drmaa` behind
   an MQ runner is the canonical deployment for exactly the scenario this PR fixes.
   Nothing pulls, either: the only other route to a callback is
   `trigger_state_change_callback` (`stateful.py:73-76`), reached from
   `bind_amqp.__process_status_message` (`pulsar/messaging/bind_amqp.py:150-152`) — i.e. only
   when Galaxy *asks*. With `poll = False` Galaxy's MQ runner never calls
   `MessageJobClient.get_status()` (`pulsar/client/client.py:530-534`), and
   `BaseMessageJobClient.full_status()` (`client.py:495-500`) raises outright if no terminal
   status was ever pushed into the cache. MQ mode is push-only.
5. Because point 2 keeps polling, once slurm-drmaa ages the job out (`MinJobAge`),
   `drmaa_session.job_status()` starts raising `InvalidJobException` on every monitor iteration —
   caught and logged at `stateful.py:386`, so it becomes a log-spam loop rather than a crash.

**Adding `FAILED` to the list at line 197 is not sufficient**, and this is the part that makes
the P1 bigger than a list edit. `__deactivate` (`stateful.py:215-224`) does exactly three things:
`active_jobs.deactivate_job`, the proxied `_deactivate_job`, and — *only if
`proxy_status == COMPLETE`* — `__handle_postprocessing`. It never calls the callback. The
terminal notification for the completion path is fired at `stateful.py:238`, **inside**
`do_postprocess`. The full set of `__state_change_callback` sites is lines 153, 157, 173, 238,
283; none is in `__deactivate`. So merely listing `FAILED` at line 197 (or swapping in
`is_job_done()`) stops the monitor leak but leaves harm #4 — the MQ hang — completely intact.

That also means **`CANCELLED` is the wrong template**, and for an instructive reason: today
`CANCELLED` fires no callback either, and it doesn't need to, because cancellation is
Galaxy-initiated — Galaxy called `client.kill()` and already knows. `FAILED` is DRM-initiated;
notification *is* the entire point. Copying the `CANCELLED` branch reproduces the bug.

Coupled to this is a behaviour change around staging. Under the old `COMPLETE` mapping a
DRMAA-failed job *did* postprocess. For a submission rejection there is nothing to stage; for a
walltime-exceeded or OOM-killed job there is partial stdout/stderr that a `remote_transfer`
deployment currently gets back and would stop getting. On the polling path this is largely
covered — `__job_complete_dict` (`manager_endpoint_util.py:35-67`) reads Pulsar's *local* job
directory, so stdout/stderr reach `fail_job` without postprocessing. On the MQ path with
`default_file_action: remote_transfer` it is a real loss. And because the terminal message is
emitted from inside `do_postprocess`, "stage the files, then notify" appears to be deliberate
ordering — which is an argument for routing `FAILED` through postprocessing too rather than
bolting a bare callback onto `__deactivate`. Either way it is a design decision the PR has to
make explicitly.

## Sibling managers — is the same bug elsewhere?

Yes, and this is the most useful thing the review turned up.

`pulsar/managers/queued_cli.py:27-32` already maps `job_states.ERROR: status.FAILED`, and its
comment says outright: *"Mirrors the JobState -> status mapping in base/base_drmaa.py."*
So the `stateful.py` gap is **already live** on the CLI manager; PR 482 does not introduce it, it
extends it to the far more heavily used DRMAA path. That is an argument for fixing
`stateful.py` rather than reverting this diff.

**Correction to an earlier draft of this note**, which dated the CLI exposure to `defe05c`
(mvdbeek, 2026-06-16) and thereby implied that commit was culpable. It is not — the gap is
much older, and `defe05c` improved matters:

- `stateful.py`'s `[status.COMPLETE, status.CANCELLED]` list dates to `f71dcd1` (2014-02-18).
- `queued_cli` has been able to emit `"failed"` since `d254d8c` (2022-09-27) introduced the
  dual-binding `job_states` at `pulsar/managers/util/cli/job/__init__.py:10-22` — Galaxy's
  `Job.states` when importable (`OK = "ok"`, `ERROR = "error"`; `lib/galaxy/model/__init__.py:2590-2596`),
  a local `str, Enum` fallback otherwise (`OK = "complete"`, `ERROR = "failed"`).
- Pre-`defe05c`, `_get_status_external` returned that member raw. A failed job was therefore
  `"failed"` (Pulsar-only) or `"error"` (combined) — **neither in the terminal list**. Post-`defe05c`
  it is `"failed"` in both. The error path's terminality is unchanged across the commit.
- What `defe05c` actually fixed was the *success* path: in a combined install `OK` returned
  `"ok"`, which is not `status.COMPLETE`, so completion detection was broken for every CLI
  plugin. It also reverted a `slurm.py` hack (`return "complete"` → `return job_states.OK`) that
  had patched the Galaxy-shared plugin with a Pulsar-vocabulary literal.
- Side benefit on the polling path: combined installs went `"error"` → `"failed"`, and Galaxy's
  `_update_job_state_for_status` ignores `"error"` but routes `"failed"` to `fail_job`. So that
  commit converted a silent hang into a correct failure for polling deployments.

The argument for fixing `stateful.py` stands; the attribution does not.

Other siblings:

- `queued_drmaa.py` and `queued_drmaa_xsede.py` inherit `_get_status_external` from
  `BaseDrmaaManager` unchanged — they pick up the fix for free. Correct.
- `queued_external_drmaa.py:59-67` overrides `get_status` and gates ownership reclamation on
  `external_status == status.COMPLETE`. With this PR a DRMAA-failed job under that manager
  **never has its working directory chowned back** to the Pulsar user, so Pulsar cannot read
  outputs or clean the directory. This is a direct, unhandled consequence of the new constant
  reaching a branch that previously never saw it. The condition should be widened
  (`status.is_job_done(external_status)` reads naturally here).
- `queued_condor.py:80-90` maps only to `COMPLETE`/`RUNNING`/`QUEUED` — Condor job failure is
  invisible to it, the same class of bug this PR fixes for DRMAA, still unfixed. Out of scope,
  worth an issue.
- `queued_pbs.py` raises `NotImplementedError`; nothing to check.

Consistency nit across the two mappings: `queued_cli.py:88` uses
`_CLI_STATE_TO_STATUS.get(state, state)` — an unmapped state leaks a foreign string into the
Pulsar vocabulary — while `base_drmaa.py:50` uses `[drmaa_state]`, raising `KeyError` on an
unmapped state. Two managers, two different failure modes for the same situation.

## Is there a shared abstraction this should be using?

Partly, and it is the cleanest route to the real fix. `status.is_job_done()`
(`status.py:23-27`) already encodes "this proxied status is terminal" and already returns True
for `COMPLETE`, `CANCELLED`, `FAILED`, `LOST`. `stateful.py:197`'s hard-coded
`[status.COMPLETE, status.CANCELLED]` is a duplicate, drifted copy of that concept. Replacing it
with `is_job_done(proxy_status)` fixes DRMAA and CLI in one line and removes the duplication.

The caveat to check before recommending that unreservedly: it also pulls `LOST` into the
terminal path. `LOST` is returned by `ExternalBaseManager.get_status` (`external.py:42`) when the
external id can't be found; today it falls through with no deactivation and no callback, which
is arguably its own bug — `stateful.py:283` already treats `LOST` as a terminal callback on the
recovery path, so the two paths disagree. Widening to `is_job_done` makes them agree, but it is a
behaviour change beyond this PR's scope and would want its own justification.

For the state-map itself: `queued_cli.py` lifted its mapping to a module-level named constant
with an explanatory comment. `base_drmaa.py` still builds its dict inline on every status poll.
Mirroring the sibling's shape would be a small, real improvement — but note `JobState` is `None`
when drmaa isn't importable (`base_drmaa.py:4-7`), so a module-level dict needs a guard or lazy
build, which is presumably why it was left inline. Worth doing, not worth blocking on.

## Test coverage

**The fix ships with no test.** There is no test anywhere that asserts DRMAA state translation.
`test/manager_drmaa_test.py` has exactly two tests, `test_simple_execution` and `test_cancel`,
both `@skip_unless_module("drmaa")` and both exercising the happy path. The PR body's claim that
grepping `test/` found no references to `_get_status_external` or `JobState.FAILED` matches what
I found.

What the PR body missed: `test/integration_test_state.py:27-61` `test_restart_finishes_job` kills
a job *directly through the DRMAA session* (`drmaa_session.kill(external_id)`, line 51),
deliberately bypassing `ExternalBaseManager.kill` so `_was_cancelled` stays False, then asserts
`consumer.messages[0]["status"] == "complete"` (line 61). A DRMAA-terminated job reports
`JobState.FAILED`, so under this PR no state-change callback fires at all and
`wait_for_messages` raises `Exception("Waited too long for messages.")` after ~3s
(`integration_test_state.py:261-267`) — the test fails on a timeout rather than an assertion.

**CORRECTED — CI has now run, and the claim above was wrong.** An earlier draft of this note said
"this test is not skipped in CI ... so `test-ci` should exercise it." It does not. CI ran on
2026-08-18 and **every job on PR 482 passed**, including all five `test-ci` factors (3.7, 3.11,
3.12, 3.13, 3.14), the Resilience Suite, and all three long `Test (3.10, ...)` jobs.

The reason is not that the behaviour is fine — it is that **`test/integration_test_state.py` is
never collected by pytest at all**:

- `pytest.ini` contains only `[pytest]` / `log_level = DEBUG`. No `python_files` override, so
  pytest's defaults apply: `test_*.py` and `*_test.py`.
- `integration_test_state.py` matches neither pattern. Nor does `integration_test_cli_submit.py`.
  `integration_test.py` does match (`*_test.py`), which is why *that* file's DRMAA tests appear in
  the log and created the false impression the directory was covered.
- Empirically: the `test-ci, 3.11` job log contains **zero** occurrences of the string
  `integration_test_state`, and the session summary reads
  `collected 342 items / 8 deselected / 334 selected` → `270 passed, 64 skipped, 8 deselected`.
  The file contributes nothing to any of those counts.

So `test_restart_finishes_job` has not run in CI — not on this PR, and not on `master`. The green
checkmark on 482 carries no information about finding 1. The P1 remains **unverified empirically**,
and the cheap-confirmation route proposed above does not exist. Confirming it now requires either
running the file directly (`pytest test/integration_test_state.py`, which works — the file is
importable and the decorators resolve; it is only the *filename* that hides it from collection) or
writing the `stateful.py` unit test described below.

**This is a separate, larger finding than the one it replaces:** two integration test files in
`test/` are dead code and have been silently uncollected for as long as they have carried those
names. See finding 11.

Tests that should be added:

- **Unit, `test/manager_drmaa_test.py`.** Assert the mapping directly, e.g. that
  `_get_status_external` returns `status.FAILED` for `JobState.FAILED` with a stubbed
  `drmaa_session.job_status`, and cover the full table so a future edit can't silently regress
  another entry. Needs `@skip_unless_module("drmaa")` for `JobState`, or a lifted module-level
  constant to make it importable without drmaa.
- **Unit, the actual regression, in a stateful-proxy test.** `test/persistence_test.py:20-35`
  already wires `StatefulManagerProxy` around a real `QueueManager`, and
  `test/manager_endpoint_util_test.py:11-40` has `_FakeJobDirectory`/`_FakeManager` fakes. Either
  harness supports a test that stubs the proxied manager to return `status.FAILED` and asserts
  (a) `active_jobs` no longer contains the job and (b) the state-change callback fired with
  `"failed"`. Both assertions are red today and red with this PR; (a) goes green with the
  `stateful.py:197` list edit, (b) only once the notification hole is closed. Keeping them as
  two separate assertions is what makes the two halves of finding 1 visible.
- **`test/integration_test_state.py`.** Either fix `test_restart_finishes_job`'s expectation to
  `"failed"` (correct — a DRMAA-killed job is not complete) or add a sibling asserting the failed
  path. Note this is a case where updating the assertion is the *right* call rather than weakening
  a test: the old expectation encoded the bug.

## Findings

1. **P1 — `StatefulManagerProxy` has no terminal path for `status.FAILED`, and there are two
   independent holes, not one.**
   (a) `pulsar/managers/stateful.py:197` lists only `[status.COMPLETE, status.CANCELLED]`, so a
   DRMAA-failed job is never deactivated, is polled forever by `ManagerMonitor`, and leaks its
   `active_jobs` entry across restarts.
   (b) Even once (a) is fixed, **no state-change callback fires**. `__deactivate`
   (`stateful.py:215-224`) never calls the callback; the terminal notification lives at
   `stateful.py:238`, inside `do_postprocess`, which `__deactivate` invokes only for `COMPLETE`.
   So under `PulsarMQJobRunner` (`poll = False`) Galaxy is never told the job failed and it hangs
   in `running` — and MQ mode is push-only, with `trigger_state_change_callback` reachable only
   when Galaxy explicitly asks (`bind_amqp.py:150-152`).
   Fixing (a) alone — whether by extending the list or by swapping in
   `status.is_job_done(proxy_status)` (`status.py:23`) — does **not** fix (b). Do not copy the
   `CANCELLED` branch as a template: `CANCELLED` legitimately needs no callback because Galaxy
   initiated it. (b) requires a deliberate choice — either fire
   `__state_change_callback(proxy_status, job_id)` for non-`COMPLETE` terminal statuses in
   `__deactivate`, or route `FAILED` through `__handle_postprocessing` so the existing
   stage-then-notify ordering is preserved (see finding 5).

2. **P1 — `ExternalDrmaaQueueManager` never reclaims directory ownership on the new state.**
   `pulsar/managers/queued_external_drmaa.py:64` gates `__change_ownership(job_id, getuser())` on
   `external_status == status.COMPLETE`. A DRMAA-failed job now skips it, leaving the job working
   directory owned by the submitting user — Pulsar can neither read outputs nor clean up. This is
   precisely the "mapping to FAILED hits a branch that previously never received it" case. Widen
   to `status.is_job_done(external_status)`.

3. **~~P2 — an existing CI-exercised integration test is predicted to break.~~ WITHDRAWN.**
   The premise was false. `test/integration_test_state.py` is not CI-exercised, because pytest
   never collects it (filename matches neither `test_*.py` nor `*_test.py`; `pytest.ini` sets no
   `python_files`). CI ran on 2026-08-18 and all of PR 482 passed, which confirms nothing either
   way. `test_restart_finishes_job:61` does still assert `"complete"` for a DRMAA-session-killed
   job, and that expectation still looks wrong — but it is dead code, so it neither breaks nor
   validates anything. Superseded by finding 11. The underlying premise (that a DRMAA-terminated
   job reports `JobState.FAILED`) also remains unverified against slurm-drmaa.

4. **P2 — no test ships with the fix.** Nothing in `test/` asserts DRMAA state translation, and
   nothing asserts that a `FAILED` proxied status deactivates the job and fires a callback. The
   second of those is where the real defect lives; existing harnesses in `test/persistence_test.py`
   and `test/manager_endpoint_util_test.py` support it without new scaffolding.

5. **P2 — loss of postprocessing/remote-transfer for DRMAA-failed jobs; coupled to finding 1(b),
   not separable from it.** Under the old mapping, `FAILED` → `COMPLETE` →
   `__handle_postprocessing` (`stateful.py:223-224`) staged partial stdout/stderr back. Treating
   `FAILED` like `CANCELLED` drops that. Fine for submission rejections, a regression for
   walltime/OOM kills on MQ + `remote_transfer` destinations; polling destinations are covered by
   `__job_complete_dict` reading the local job directory. The coupling: postprocessing is also the
   *only* thing that sends the terminal message (`stateful.py:238`), which looks like deliberate
   "files land, then notify" ordering. So the choice made here determines how 1(b) is solved.
   Routing `FAILED` through postprocessing addresses both at once; a bare callback in
   `__deactivate` addresses 1(b) and accepts this regression. Either is defensible — it just has
   to be an explicit decision rather than a side effect.

6. **P3 — `stateful.py:197` duplicates `status.is_job_done()`.** Two expressions of "this status
   is terminal" that have drifted apart. Consolidating is the reusable-abstraction win available
   here and fixes `queued_cli` at the same time — but note it only addresses finding 1(a), not
   1(b). Blocker to doing it blind: it also promotes `LOST` to terminal, which is a real (probably
   desirable — `stateful.py:283` already treats `LOST` as terminal on the recovery path) but
   out-of-scope behaviour change.

7. **P3 — the DRMAA state map is still an inline dict rebuilt on every poll.** `queued_cli.py:27-32`
   lifted the equivalent to a documented module-level constant and its comment points back at
   `base_drmaa.py`. Mirroring it makes the mapping unit-testable without a manager instance.
   Caveat: `JobState` is `None` when drmaa isn't importable (`base_drmaa.py:4-7`), so it needs a
   guard or lazy build.

8. **P3 — inconsistent handling of unmapped states between the two managers.**
   `base_drmaa.py:50` uses `[drmaa_state]` (raises `KeyError`); `queued_cli.py:88` uses
   `.get(state, state)` (leaks a foreign string into the status vocabulary). Neither is obviously
   right, but they should not differ.

9. **P3 — `JobState.UNDETERMINED: status.COMPLETE` (`base_drmaa.py:40`) is left untouched.**
   `UNDETERMINED` means the DRM cannot determine the state, typically because the job aged out;
   `status.LOST` is the semantically correct target and Galaxy handles `"lost"`
   (galaxy `lib/galaxy/jobs/runners/pulsar.py:377`). Changing it would break the common
   "job finished, DRM forgot it" path, so leaving it alone is the right scope call — noting it
   only so it isn't mistaken for a reviewed-and-approved mapping.

10. **P3 — `queued_condor.py:80-90` has the same class of bug, unfixed.** It maps only to
    `COMPLETE`/`RUNNING`/`QUEUED`; a failed Condor job is reported as complete. Out of scope for
    this PR; worth a follow-up issue so the pattern gets closed rather than fixed one manager at
    a time.

11. **P1 (new, empirical) — three test files have never been collected by pytest.**
    *Filed upstream as [galaxyproject/pulsar#484](https://github.com/galaxyproject/pulsar/issues/484) on 2026-08-18.*
    `test/integration_test_state.py` and `test/integration_test_cli_submit.py` match neither of
    pytest's default `python_files` patterns (`test_*.py`, `*_test.py`), and `pytest.ini` declares
    only `log_level`. Verified against the `test-ci, 3.11` job log on PR 482: zero occurrences of
    `integration_test_state`, session summary `collected 342 items / 8 deselected / 334 selected`.
    Neither file is skipped, deselected, or errored — it is simply invisible. This is not caused by
    PR 482 and is not gkr0110's to fix, but it is the reason the review's cheapest verification
    route evaporated, and it means Pulsar's restart/recovery and CLI-submit integration coverage
    has been decorative since the nose-to-pytest migration in `1da5d6d` (2021-02-02) — 9 tests across
    `integration_test_state.py` (6), `integration_test_cli_submit.py` (2) and `cli_help_tests.py` (1).
    nose's `testMatch` regex matched any filename containing `_test`; pytest's default `python_files`
    does not. Fix is a one-liner (`python_files = test_*.py
    *_test.py integration_test_*.py` in `pytest.ini`) — but expect the newly-collected tests to
    need work before they go green, which is exactly why this deserves its own issue and PR rather
    than being smuggled into 482.

## Verdict

**Request changes.** The diagnosis is right, the constant is right, the import is clean, and the
change is a genuine improvement on the REST/polling path. But shipping it alone converts a
"wrongly reported complete" bug into a "job hangs forever with no notification" bug for MQ
deployments — which is the deployment shape the reporter is describing — and silently breaks
ownership reclamation under `queued_external_drmaa`.

Finding 2 is a one-line change. Finding 1 is not: half of it is a list edit, and the other half
is a small design decision about *where* the terminal notification for a non-`COMPLETE` status
gets emitted, because today that notification only exists inside the postprocessing path. That is
the piece to settle with the author before this merges — and it is the piece their otherwise
careful test plan couldn't have surfaced. With finding 1 resolved in both halves, finding 2
fixed, and a red-to-green test on the `stateful.py` behaviour, this is a good merge.

The highest-value version of this PR pushes the fix down into `stateful.py`, since the identical
latent bug has been reachable through `queued_cli.py` since 2022 (see the correction under
"Sibling managers" — not since `defe05c`, which improved that manager rather than breaking it)
and would be closed by the same change.

One thing to raise with the author kindly: their test plan is honest and unusually thorough for a
one-line PR — real cluster reproduction, a `git blame` check, a targeted grep. The grep just
searched for the wrong thing. Looking for consumers of `status.FAILED` rather than for references
to the changed symbol would have surfaced `stateful.py:197` immediately.
