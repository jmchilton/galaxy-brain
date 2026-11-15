Run via Claude Opus 5.5 at high effort.

**Recommendation: expand modestly and stay on `release_26.2`, landing the branch as two stacked PRs on the parent, cancel retry first.** The cancel retry is a plain bug fix for every stop path, not only for this branch's timeout. When a user deletes a job, or `fail_job` runs, while the TES server is briefly unreachable (a restart, a 503 under load), the task is orphaned and keeps using compute. Today nothing retries that cancel, so a retry kept in memory that a restart loses is still strictly better than the status quo. It belongs on the release branch. Expand it slightly: key pending cancels by `(tes_url, task_id)` rather than by bare task id. Codex's P2 is still half true after the thermo-nuclear rewrite: `TesCancelRetries` groups by server, but `add` dedupes and `discard` pops by task id across all servers. The unreachable timeout is the riskier half: as implemented, a TES API outage longer than an hour fails every long job that is still running fine, and the cancel retry then kills those tasks when the server returns. Stage 5's tesp-api run showed exactly that, a task that resumed and completed. To keep the timeout on 26.2, narrow it so it fails only jobs that Pulsar never reported `running` (`job_state.running`, which `recover()` also restores). A task whose in-task Pulsar has reported `running` has already reached the broker and will report its final status without the TES API. That is a few lines and one test. Its cost is that a task dying mid-run during a long outage hangs as it does today, with a warning logged every minute. If John prefers the timeout as implemented, it should go to `dev` instead, or ship on 26.2 with a 0 (off) default. Don't fold in persistence across restarts, per-destination options, or a request timeout, which belongs upstream in pydantic-tes.

Evaluated at `9c1da8a3657` against the parent `tes_task_state_polling` at `fdb30869fa8` (itself on `origin/release_26.2` `c9bd104e5e1`, which has no `v26.2` tag yet). Four commits, +717/−33: `pulsar.py` +202, new `util/tes_cancel_retries.py` +130, `util/tes_task.py` +14, `job_conf.sample.yml` +8, `test_pulsar_tes_task_checks.py` +396.

## Possible Decompositions

About 350 lines of runner, helper and sample config code (including docstrings and comments), plus about 400 lines of tests. The current commits are `388e28486ab` (baseline test), `87d76ac0448` (pure refactor: `_cancel_tes_task` out of `_kill_remote_job`), `cbe9c350514` (unreachable timeout) and `9c1da8a3657` (cancel retry with `TesCancelRetries`).

1. **One PR (as implemented).** All four commits stacked on the parent's PR. The reviewer sees one topic, "Galaxy and an unreachable TES server": give up checking after a while, and don't let a missed cancel orphan the task. Smallest merge-forward cost. The timeout's policy and the retry's machinery get reviewed together, so pushback on either holds up both.
2. **Two PRs, timeout first, then cancel retry (current commit order).** PR A is commits 1–3; PR B is commit 4 stacked on it. No reordering is needed (the baseline refactor debrief says so). But the bug fix that matters for every stop waits behind the policy change. And without PR B, every job the timeout fails has its single cancel sent to a server that just failed a check.
3. **Two PRs, cancel retry first, then timeout.** PR A is the baseline test, the refactor, `tes_server_unreachable_reason` (moved down from the timeout commit), `TesCancelRetries`, `tes_cancel_retry_timeout`, the `poll` change with its check-interval gates, and the shutdown log. PR B is `tes_unreachable_timeout`, `TesTaskWatch.unreachable_since` and `_check_tes_server_unreachable`, including handing a failed job's cancel to the retries (`stop_job = False`). This needs the timeout and retry commits rebuilt. Their test file was already rebuilt once, by deletion, so this is mechanical but not free. PR B can then target 26.2 or `dev` independently.
4. **Either split, with the parent.** The parent is its own PR. Both pieces here stack on it, since they extend `PulsarTesJobRunner`'s monitor thread, `_kill_remote_job` override and `util/tes_task.py`. Neither piece applies to `release_26.2` without the parent.

## Scopes considered

### As implemented

`tes_unreachable_timeout` (default 3600 s, 0 forever): a task check that fails with a connection error, a timeout or a 5xx starts a clock on the watch, any answer resets it, and once it reaches the timeout the job fails through `fail_job` if Pulsar hasn't reported. `tes_cancel_retry_timeout` (default 86400 s, 0 tries once): a cancel that fails because the server is unreachable is retried from the monitor thread, backing off per TES server (10 s, then doubling to 120 s), in memory, with shutdown naming what's left.

| Pros | Cons |
| --- | --- |
| • Ends the last "job hangs forever" case in the parent: a TES server that is gone leaves jobs `queued`/`running` indefinitely, and the parent retries checks forever. | • The timeout fails healthy jobs: a TES API outage longer than an hour, with tasks still running (Funnel workers, tesp-api's outer Pulsar and TESK pods all keep running), fails them, and the retry then cancels them. Stage 5 item 8 on tesp-api is that case. |
| • The cancel retry fixes orphaned tasks on every stop path (stop queue, `fail_job`, STOPPED status), not just after the timeout. Verified live on tesp-api, and on Funnel up to Funnel's own limit. | • New default-on behavior on a release branch: the monitor thread now runs with `tes_status_check_interval: 0` (for the retries), and a black-holed server costs a blocking probe (about 127 s) every 120 s for up to a day. |
| • Well hardened: per-server backoff in its own module, test and mutation coverage, perf simulations (cancel POSTs 856 → 57 for 200 jobs). | • Pending cancels are deduped and discarded by bare task id across servers (Codex P2, still half true). |
| • Both options can be turned off. | • Restart loses pending retries. That isn't a regression (today there are none), but a reviewer will ask. |

<details>
<summary>Details</summary>

The parent's scope evaluation kept this branch separate for two reasons: the timeout can fail healthy jobs, and the cancel retry keeps state a restart loses. Those reasons have different weights. The second is a limitation, not a risk: before this branch Galaxy sends one cancel and forgets, so in-memory retries can only reduce orphans. The first is a real policy cost and the only part of the branch I'd hesitate to ship on a release branch as is.

How often the timeout fires on a healthy job: Pulsar's final status travels over AMQP, not the TES API, so a task that *finishes* during the outage reports and is safe (`pulsar_reported`). The jobs at risk are those still running when the outage passes the timeout. That is every long job during a long maintenance window: the case sites most care about.

</details>

### Recommended: two PRs on `release_26.2`, retries keyed by server, timeout only for jobs Pulsar never reported running

As implemented, plus:

1. **Key pending cancels by `(tes_url, task_id)`.** In `TesCancelRetries`, make `add` check only the target server's `cancels`, and have `discard` take the TES URL (from `destination_params`, which `_kill_remote_job` has). About 5 lines plus a two-server test. It makes the module's model ("pending cancels, keyed by TES server and task id", its own docstring) true.
2. **Fail for an unreachable server only when the job never reached `running`.** In `_check_tes_server_unreachable`, keep watching (and keep logging) when `job_state.running` is set. A queued task on a server that's gone will never run, so failing it is right. A running task whose Pulsar reported `running` has a working broker connection and will report on its own. About 3 lines, plus one test (a running job survives a server down for 3 × the timeout, then completes through Pulsar's `complete`), the docstring, the sample config, and the job info wording, which can then say "before the task started".
3. **Split into two PRs, cancel retry first** (decomposition 3). PR A is a release-branch bug fix with no new failure path. PR B is the policy, small and easy to drop or retarget.

| Pros | Cons |
| --- | --- |
| • Ships the orphaned-task fix on 26.2 with the parent, whose own stop path otherwise orphans tasks on any brief outage. | • A task that dies mid-run while the TES server is down still hangs (the pre-branch behavior), though Galaxy's log warns every check. |
| • The timeout no longer fails healthy jobs, which was the main reason to keep it off 26.2. | • The demo's `unreachable` acceptance scenario (`scripts/tesp/acceptance/unreachable-cancel.sh` stops tesp-api while the tool runs and expects `error`) would need to stop the server while the task is queued, or test the retry through a user cancel. |
| • Fixes the cross-server dedupe in the branch's own new module. | • Rebuilding the commits for decomposition 3 is real work, and two PRs mean two reviews. |
| • Each PR is about 200 code lines and about one idea. | • Diverges from the GA4GH project's stage 5 design, which counted failing a running job as correct. |

<details>
<summary>Details</summary>

Why `job_state.running` is a reliable signal here: in `PulsarJobRunner._update_job_state_for_status` the job moves to `RUNNING` only on Pulsar's `running` status (line 481 at `9c1da8a3657`), and `recover()` restores `job_state.running` for `RUNNING` jobs after a restart. So it means "the in-task Pulsar spoke to the broker", not "TES said so". Nothing else in `pulsar.py` sets the job `RUNNING`.

What the narrower rule gives up: the whole TES installation dies (server, workers and the in-task Pulsars together) and never comes back. The jobs still `running` then hang until an admin acts, as they do today. A server outage is admin-visible (warnings every check, failed submissions), unlike the parent's case of one task dying silently, which is why automatic failure is less essential here.

If John wants the timeout to cover running jobs too, that's a reasonable policy for `dev`, where a release note and a longer soak time can carry it. Alternatively, keep it on 26.2 with a much longer default (for example 86400 s, matching the retry cap) or a 0 default.

</details>

### Contraction: cancel retry on `release_26.2`, unreachable timeout to `dev`

PR A as in decomposition 3 targets the release branch. The timeout, unchanged, targets `dev` after the parent merges forward.

| Pros | Cons |
| --- | --- |
| • No new job-failure policy on the release branch at all. | • 26.2 keeps jobs hanging forever on a dead TES server; the parent's polling only helps when the server answers. |
| • The timeout keeps its current, stronger semantics, which the project tested live. | • Two targets: the `dev` PR waits for the parent and PR A to merge forward, then needs a rebase. |
| | • The same commit rebuild as decomposition 3. |

### Variant: both on `release_26.2`, timeout off by default

Same code, with `tes_unreachable_timeout` defaulting to 0 on the release branch (sites opt in), and 3600 s on `dev` or everywhere later.

| Pros | Cons |
| --- | --- |
| • No behavior change for upgrading sites beyond the cancel retry. | • The parent's evaluation rejected differing defaults between release and `dev` (merge-forward surprises, confusing docs). |
| • No commit rebuild; one PR stays viable. | • Opt-in options for a rare condition go unused, so the hang stays in practice. The recommended rule is safe enough to leave on. |

### Contraction: everything to `dev`

Keep the branch as is, but target `dev` once the parent merges forward.

| Pros | Cons |
| --- | --- |
| • Simplest for the release branch. | • 26.2 ships the parent's stop path without retries: a cancel during a TES restart orphans the task, and the parent's checks retry a dead server forever. |
| | • Galaxy is liberal about release-branch fixes, and 26.2 isn't tagged yet. The cancel retry is a bug fix by any reading. |

### Expansions considered and rejected

- **Persist pending cancels across a Galaxy restart.** It would need a table or an abused job column plus a startup scan of final jobs. Not a regression to skip, and the shutdown log names the tasks. Revisit if Galaxy grows a generic "external cleanup owed" record.
- **A request timeout** for pydantic-tes 0.4.0 (Codex P1, the black-holed server). It belongs upstream: pydantic-tes `timeout`, then Pulsar's `tes_client_from_params`, then the pins. Faking it in Galaxy means private attributes or global socket defaults.
- **Per-destination options** instead of runner options (the plan's wording). This would need the parent's two options moved first. Nobody has asked for it; it's a parent-level follow-up if anyone does.
- **Running the retries independently of the database check or on their own thread** (thermo-nuclear notes 4 and "retries stall during a DB outage"). That's more machinery than the two `tes_status_check_interval` guards it would remove, for a rare overlap of two outages.
- **Pulsar reporting `failed` when Galaxy refuses every upload** (stage 6, "Why pulsar-finish said complete"). It's a Pulsar design change to a deliberate upstream rule, for a status Galaxy ignores on a final job. With the retry, the orphan no longer reaches `pulsar-finish` in the tested scenario.
- **Fold this branch into the parent.** That reverses the parent's frozen, hardened READY state for the riskiest code. No.

## Parent findings

For `tes_task_state_polling` at `fdb30869fa8`. Listed only; not changed.

- **`_tes_task_watches` is keyed by bare task id** (Codex P2's other half). Two TES destinations whose servers hand out the same id would share a watch. The servers tested use effectively unique ids (ObjectId/UUID, xid, `task-` plus a random suffix), so this is low priority. If the child keys cancels by `(tes_url, task_id)`, the parent's watches should follow, for consistency.
- **Test overlap the child creates.** The parent's `test_tes_server_errors_never_fail_the_job` (renamed by the child) overlaps the child's timeout test. Its one extra assertion (no FULL view on errors) could move into the parent's other error test so the child can drop the renamed copy. The test challenger noted this; cosmetic.
- **Grace period default** (600 s vs 120 s on the release branch) is still John's open call on the parent. It's independent of this branch, but the same reasoning applies: prefer defaults that don't fail healthy jobs during infrastructure hiccups.
