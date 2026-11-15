Run via Claude Opus 5.5 at high effort.

**Recommendation: expand modestly, staying on `release_26.2`.** Keep both fixes: polling that fails jobs whose TES task died unreported, and treating a cancel of an already ended task as done. Then add two small things that correct this branch's own behavior. First, ignore a late `complete`/`cancelled` for a job that is already `ok` or `error`, using the same rule `pulsar_mq_status_poll` already settled on (DELETED/DELETING still finish). The debrief lists this as open question "Late `complete` after a failure": the base runner already had the gap, but this branch is what makes it reachable. Second, move the two job-info correctness fixes out of the child branch `tes_task_state_polling_unreachable`. These are the single-log rule (don't credit tesp-api's whole-task log to "Executor 0 (pulsar-submit)") and the SYSTEM_ERROR reason taken from the system logs. Both are pure changes to `util/tes_task.py`, which this branch adds, and they fix wrong text this branch would otherwise ship. Keep the unreachable-server timeout and the in-memory cancel retry in the child. They add a policy that fails possibly healthy jobs after an hour-long outage, plus retry state that a restart loses. Each deserves its own review, and as a separate PR they are easy to leave off the release branch. Don't fold in Pulsar `kill()`, the pydantic-tes timeout and states, generalizing to GCP Batch, or tasks stuck in TES `QUEUED`. The expansion adds about 30 runner and helper lines from the late-status guard plus its tests, and about 110 helper lines with about 200 test lines lifted from the child.

Evaluated at `dec68d7a865` (base `origin/release_26.2`). Twelve commits, +1150/−5: `pulsar.py` +243, new `util/tes_task.py` +211, `job_conf.sample.yml` +6, new `test_pulsar_tes_task_checks.py` +690.

## Possible Decompositions

The branch has about 460 lines of code and 690 lines of tests. The history now begins with baseline tests (`a2619a1c5b2`) and a pure hook refactor (`341d1043671`). Polling comes next (`7b16c21158b`, `fc3bf3f6efc`), then the cancel fix (`645fa461a8a`), then review and hardening commits (`69f787c5092` … `dec68d7a865`). The cancel fix relies on helpers that the polling commit added to `util/tes_task.py`: `fetch_tes_task_state`, `describe_tes_error`, redaction and `TES_FINISHED_STATES`. So any split that lands the cancel fix first has to reorder those commits and carve out part of the helper.

1. **One PR (as implemented).** Squash the review-fix commits (mypy, fake clock, test tightening) into the commits they fix, leaving baseline, refactor, polling, message length, cancel and the later hardening. The reviewer gets one coherent story: "Galaxy finally asks TES about tasks Pulsar never reported, and stops wedging on cancels TES refuses."
2. **Two PRs, cancel fix first, then polling.**
   - PR A: the baseline tests, the `pulsar_param_specs` / `_kill_remote_job` refactor, the TES `_kill_remote_job` override, and the part of `util/tes_task.py` it needs. That part is `fetch_tes_task_state` with the PREEMPTED/CANCELING workaround, `describe_tes_error`, `http_status_code`, the redaction pattern pass and `TES_NOTHING_TO_CANCEL_STATES`. It is a small, self-contained P1 bug fix (TESK's 400 wedges the stop queue and leaves `fail_job` jobs unfailed) with no new option and no new default behavior. The `pulsar_param_specs` hook can wait for PR B.
   - PR B, stacked on A: the options, `TesTaskWatch`, `check_watched_item`, the failure description and known-secret redaction, the sample config, the cross-thread "Pulsar reported" record, plus the recommended additions. This is the behavior change.
3. **Two PRs, polling first, then cancel (current commit order).** PR A is the baseline tests, refactor, polling and hardening. PR B is the cancel override and its tests. This needs no reordering, but the smaller, less debatable fix waits behind the larger one. And until PR B lands, polling's own `fail_job` path stays safe only because it sets `stop_job = False`.
4. **Three PRs: refactor, cancel, polling.** PR A is the baseline tests plus `341d1043671` alone: two extension points and four tests, trivially reviewable, with no behavior change. PR B is the cancel fix, then PR C is polling, as in option 2. This makes the most merge-forward work for the least gain. Choose it only if reviewers push back on the hooks.
5. **With the child.** In any option, the child becomes PR "N+1" stacked on polling. If the recommended expansion moves the job-info fixes into this branch, the child shrinks to two commits: the unreachable timeout without the single-log part, and the cancel retry. Those could even be two PRs, unreachable timeout first, since the cancel retry builds on the timeout's notion of "unreachable".

## Scopes considered

### As implemented

The TES runner turns on its monitor thread. Every 60 s it reads each watched task (BASIC view), and once a task has been finished or 404 for 120 s with no final Pulsar status, it fails the job through `fail_job` with a redacted summary of the failing executor and the tail of its stderr. Separately, a cancel that TES refuses is checked against the task's state and is never raised, so the stop queue can't loop and `fail_job` can't be left half done.

| Pros | Cons |
| --- | --- |
| • Fixes the chain's most damaging failure (item 1): jobs and WES runs that hang forever with nothing visibly wrong. | • A late `complete` for a job this branch failed re-enters `finish_job` (`completed_normally=False`, output collection, `JobWrapper.finish` → `fail()` again). It's a known open question, and this branch is what makes it reachable. |
| • Fixes item 30 (TESK's 400 on cancel) at the one Galaxy seam (`_kill_remote_job`), covering the stop queue, `fail_job` and the STOPPED-status path. | • The job-info text credits tesp-api's single whole-task log to "Executor 0 (pulsar-submit)", and for Funnel SYSTEM_ERROR it says "exited with code 0". The child fixes both, but stacked behind an outage policy that may never ship on 26.2. |
| • The shared runner gets only two narrow hooks, and the other Pulsar runners still reject the new options. | • A new default-on behavior on a release branch: HTTP traffic to TES, and jobs failed that used to hang (see Risks). |
| • Reproduced on Funnel, TESK and in the demo, and through test, perf, Codex, thermo-nuclear and baseline passes. | • No request timeout (a pydantic-tes gap): a silent TES server stalls every TES check on the handler. |

<details>
<summary>Details</summary>

Everything the implementation and hardening passes chose to leave out has a reason recorded: the narrow job select (small gain, replaces a shared abstraction), moving `PulsarTesJobRunner` to its own module (load path, release-branch churn), a TES interactive-tools `guest_ports` branch (never worked for TES), and batch `GET /tasks` (pydantic-tes takes no filters). None of these is a scope miss.

The "status before the first check" open question was fixed in `2402c691a80`. "Tasks stuck in `QUEUED`" and "resubmission on these failures untested" remain. Both are discussed below.

</details>

### Recommended: modest expansion

As implemented, plus:

1. **Ignore a late terminal status for a job that already ended.** In the base `_update_job_state_for_status`, return early on `complete`/`cancelled` when the job is already `ok` or `error` (and FINISHING, if this branch wants exact parity), but still finish DELETED/DELETING jobs, because `JobWrapper.finish()` → `fail()` is what cleans them up. This is the rule `pulsar_mq_status_poll` (targeting `dev`, ready for final review) settled on after its own review (its H2). Using the same rule makes the merge forward a trivial conflict, and ideally the two branches share the wording. It would also be the natural home for `PULSAR_FINAL_STATUSES`, which the thermo-nuclear pass noted duplicates the literal lists here. Test: fail a job through polling, deliver `complete`, and assert that `finish_job` isn't queued. Roughly +6 runner lines and a 20-line test.
2. **Lift the child's job-info fixes.**
   - `_logs_are_per_executor` and the "The task exited with code N." / "Task stderr" wording, taken from `f71ca18704d`, without the unreachable timeout.
   - The SYSTEM_ERROR reason from the system logs, which is all of `025f1256ec3`.

   Both change only `describe_tes_task_failure` and its tests. The single-log rule has a known cost the child already accepted: a staging failure at executor 0 on Funnel or TESK loses its executor name, though the stderr tail stays. So say so in the PR.

| Pros | Cons |
| --- | --- |
| • Closes the one correctness gap this branch opens itself (late `complete` after a polling failure). | • Item 1 touches the base `_update_job_state_for_status`, the code shared by every Pulsar MQ runner. It's a two-line guard, but it changes non-TES behavior too: a repeated `complete` for an `ok` job no longer re-runs `finish_job`. |
| • The job info the PR introduces is right on all three TES servers the project tested (Funnel, TESK, tesp-api), instead of depending on a child PR that may not reach 26.2. | • Item 2 means splitting `f71ca18704d` and rebasing the child, which is already stale (it sits on the old `dev` parent `e3c0cc44649`, and its record still says `upstream_base_branch: dev`). |
| • The child becomes a single topic, "TES server unreachable", which is easier to judge and easier to keep off a release branch. | • It adds about 300 lines to an already 1150-line PR. |
| • Uses `pulsar_mq_status_poll`'s rule rather than inventing a second one. | |

<details>
<summary>Details</summary>

Why the late-status guard belongs here rather than waiting for `pulsar_mq_status_poll`: that branch targets `dev`, is blocked on its own review, and carries a much larger change (status polling for MQ runners, a mid-finish set). This branch is the one that, on 26.2, creates a common path to "job already `error`, then `complete` arrives": Galaxy's AMQP consumer is down longer than interval + grace while tasks finish, or (with the child) a TES API outage. Today that message runs `finish_job` against a failed job. It downloads outputs with `completed_normally=False`, may run external metadata, and `JobWrapper.finish` calls `fail()` a second time. That's mostly harmless, but it's noisy and racy, and reviewers will ask about it.

The guard should not use `job.finished` as the `failed` branch does, if that includes DELETED. Deleted jobs need `finish()` → `fail()` for cleanup, which is exactly the H2 finding in `pulsar_mq_status_poll`'s review.

Why the SYSTEM_ERROR and single-log fixes belong here: they are corrections to `describe_tes_task_failure`, a function this branch creates. Neither adds an option, a thread, or a new failure path. Shipping the parent without them means 26.2 users on tesp-api see a misleading "pulsar-submit exited with code N" for tool failures, and Funnel users see "exited with code 0" for SYSTEM_ERROR.

</details>

### Larger expansion: fold the whole child in

Everything in the recommended expansion, plus `tes_unreachable_timeout` (default 3600 s: fail the job after an hour without reaching the TES server) and `tes_cancel_retry_timeout` (default 86400 s: retry a cancel that failed because the server was unreachable, in memory, from the monitor thread).

| Pros | Cons |
| --- | --- |
| • One PR finishes the "jobs never hang on a TES problem" story. Without the timeout, a dead TES server still leaves jobs `running` forever (stage 3's TESK jobs were retried every 15 s through stage 4). | • The timeout fails jobs whose tasks may still be running fine during a long TES API outage. That's a policy choice with real cost, and on a release branch it's the riskiest piece. |
| • A single merge forward instead of two. | • The cancel retry adds +204 runner lines of in-memory state that a restart drops. It's the most intricate part of either branch and deserves separate review. |
| | • The PR would be about +2000 lines, too large for one review on a release branch. |
| | • The child isn't rebased onto the retargeted parent, and its fork CI is unchecked. |

### Contraction: cancel fix only on `release_26.2`

Ship only the `_kill_remote_job` hook and TES override (item 30) with the helper subset it needs. Polling goes in a later PR, at the same target or on `dev`.

| Pros | Cons |
| --- | --- |
| • A clean P1 bug fix with no new option and no default behavior change, the easiest possible release-branch PR. | • Leaves item 1, the worse bug, unfixed on 26.2: jobs whose task died unreported still hang forever. |
| • About 150 code lines. | • John chose `release_26.2` for the polling behavior too; this re-scopes that decision. |
| | • It's really decomposition option 2 with the second PR deferred. Listed for completeness. |

### Variant: polling ships default-off on `release_26.2`

Same code, but `tes_status_check_interval` defaults to 0 on the release branch (and to 60 on `dev` on merge forward).

| Pros | Cons |
| --- | --- |
| • Sites upgrading within 26.2 see no new HTTP traffic and no new failure path unless they opt in. | • Most affected sites never learn the option exists, so the bug stays in practice. |
| | • Defaults that differ between release and dev cause merge-forward surprises and confuse documentation. |
| | • Galaxy is liberal about release-branch fixes, and TES users are few and are the ones hitting the hang. The grace-period knob (see Risks) is a better mitigation. |

### Contraction: state-only failure message, no FULL read

Fail the job with "TES task X ended in state Y" only. Drop the FULL read, the executor summary, the stderr tail and most of the redaction (the cancel path still needs `describe_tes_error`'s redaction).

| Pros | Cons |
| --- | --- |
| • Roughly halves `util/tes_task.py` and removes the subtlest code (redacting secrets out of TES logs). | • Users and admins lose the diagnosis: "pull access denied", the staging error, the exit code. That diagnosis made the demo failures actionable. |
| | • Some redaction is still needed for the warning logs, so the risk surface shrinks less than the line count. |

### Expansions considered and rejected

- **Pulsar-side `kill()` fix** (`pulsar/client/tes.py`, return quietly for a final or 404 task). It's warranted, but it's a Pulsar PR plus a release and pin bump, and Galaxy's override would stay for the non-final "log, don't raise" case. Track it as a Pulsar follow-up.
- **pydantic-tes timeout, TES 1.1 states, MINIMAL view** (item 20). The real fix for the silent-server stall lives upstream (`TesClient(timeout=…)`, then Pulsar's `tes_client_from_params`, then Galaxy pins). Faking it in Galaxy means reimplementing `get_task` on private attributes or changing global socket defaults. Follow-up.
- **Generalize the watch to other co-execution runners** (`PulsarGcpBatchJobRunner` has the same `poll = False` blind spot). That needs a per-backend state API (GCP Batch jobs, not TES tasks) and a base-class abstraction with no second implementation to test against. Worth an issue, not this PR.
- **Tasks stuck in TES `QUEUED`** (no capacity). Failing them is a timeout policy (how long is too long to queue?) that differs by site. Leave it to an admin option in a later PR, if anyone asks.
- **A test for resubmission on these failures.** The real state handlers run, and this is a test addition rather than a scope change. The test challenger chose not to add it. Optional.

## Risks of shipping on `release_26.2`

- **The default-on monitor thread and HTTP traffic.** Each TES handler now sends one `GET ?view=BASIC` per watched job per minute, serially. That's modest (about 17 req/s at 1,000 jobs), but it's new behavior a minor upgrade turns on. `tes_status_check_interval: 0` restores the old behavior, and the release notes should say so.
- **False failures when Galaxy's AMQP consumer lags.** If the consumer is disconnected or backed up for longer than about interval + grace (3 to 4 minutes by default) while tasks finish normally, the runner sees COMPLETE with no report and fails jobs whose results are sitting in the broker. Before, those jobs finished when the consumer caught up. The window is narrow, but 120 s of grace is short for a broker or consumer hiccup on a busy server. Consider a more conservative default grace on the release branch, such as 600 s. Detection then takes about 11 to 12 minutes instead of 3 to 4, still far better than never. The recommended late-status guard makes the late `complete` a clean no-op, but it can't undo the failure.
- **A silent TES server stalls all TES checks on the handler** (no request timeout). The impact is limited: status messages still drive jobs, and the kill path has the same pre-existing exposure. But it's new monitor-thread blocking on 26.2.
- **The PREEMPTED/CANCELING workaround** reads the state out of a pydantic validation error. When the pin moves to a pydantic-tes with those states, the code still works (the parse simply succeeds), but `test_tes_states_newer_than_pydantic_tes_are_recognized` will need updating. On a release branch, a pin bump would be rare anyway.
- **Merge forward.** `pulsar_mq_status_poll` (on `dev`) touches `_update_job_state_for_status` and `check_watched_item` in the base runner. Expect a conflict in `_update_job_state_for_status` when 26.2 merges into `dev`, smaller if the late-status guard uses the same rule.
