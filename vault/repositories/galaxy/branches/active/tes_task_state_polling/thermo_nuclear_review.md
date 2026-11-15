Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: tes_task_state_polling

I reviewed `origin/release_26.2...4daaeb28a31` and acted on the one finding with a clear behavior-preserving fix. The text that becomes `Job.info` was assembled in two places: a prefix in `PulsarTesJobRunner._tes_task_failure` and the executor summary in `util/tes_task.py`. That text now comes from one pure function in the helper module, and the known-secret collection moved there too. That change is `e0eacf9c6c6` ("Describe unreported TES task endings in the TES helper module"). Its runner diff against the base drops from +263 to +238 lines, and `pulsar.py` no longer imports `urllib.parse`. I made no other changes. The rest of the TES code in the runner is orchestration that needs the runner (job state, `fail_job`, the kill hook), and moving the runner class itself would mean churn on a release branch. No security findings.

Tests: the 83 tests in `test_pulsar_tes_task_checks.py`, `test_pulsar_runner.py` and `test_runner_pulsar.py` pass. black, isort and ruff are clean. mypy (`cd lib`) reports only the pre-existing `galaxy/managers/notification.py` error.

## Not acted on

- **`pulsar.py` stays over 1k lines (1588 on the base, 1826 now).** It crossed that line before this branch. The branch keeps a lot of TES code in the file, but the clean way out is to move `PulsarTesJobRunner` into its own module. That would break the `galaxy.jobs.runners.pulsar:PulsarTesJobRunner` load path, unless a re-export at the bottom of `pulsar.py` created a circular import. Either way it isn't release-branch material. Splitting the Pulsar runners into modules on `dev` would be a broader refactor. This branch doesn't make it more urgent, so I didn't write a follow-up issue.
- **Moving the grace-period state machine onto `TesTaskWatch`.** I tried it. The logic is about eight lines, and the INFO line the runner logs when it first sees a finished task would need a three-way return value. That moves the complexity without deleting it.
- **`_kill_remote_job(client, job_wrapper, destination_params)`: the base class ignores the last two arguments.** This is the smallest hook that serves both `client.kill()` call sites. Narrowing it to `(client, job)` would make `_update_job_state_for_status` read destination params from `job` rather than from `job_state.job_destination`, which is a subtle change in untouched code.
- **The TES `check_watched_item` override drops the parent's MQ `guest_ports` branch.** Before this branch the TES runner never ran `check_watched_item` (`poll = False`), so TES interactive-tool entry points were never configured by polling either. Behavior is unchanged. The divergence from `PulsarKubernetesJobRunner` is worth knowing about if TES interactive tools are ever wanted.
- **`tes_client_from_params(parse_tes_job_params(...))` appears twice.** `_check_tes_task` also needs the parsed params for the secrets, so a shared helper would have to return both. That isn't worth the indirection.
- **`PULSAR_FINAL_STATUSES` duplicates the literal status lists in the base `_update_job_state_for_status`.** Reusing the constant there means editing code the branch doesn't otherwise touch.
- **The three comments on the cross-thread watch** (dataclass, `__init__`, `_watch`) overlap a little. Each covers a different part (why the flag exists, who removes watches, why `setdefault` is used), so I left them.
- **No new unit test for `tes_known_secrets` or the moved message text.** `test_known_secrets_are_redacted_exactly` and the message assertions in the runner-level tests already cover them through the real runner.

<details>
<summary>Full review</summary>

### Scope

- `lib/galaxy/jobs/runners/pulsar.py` (+263 on the base before this pass): the `pulsar_param_specs` class attribute, the `_kill_remote_job` hook at both `client.kill()` sites, `PULSAR_TES_PARAM_SPECS`, `TesTaskWatch`, and the `PulsarTesJobRunner` polling, failure and cancel logic.
- `lib/galaxy/jobs/runners/util/tes_task.py` (new): state fetch with the pydantic-tes 0.4.0 workarounds, error description, failure summary, redaction.
- `lib/galaxy/config/sample/job_conf.sample.yml`: the two options, commented out.
- `test/unit/app/jobs/test_pulsar_tes_task_checks.py`, already challenged in `test_challenges_debrief.md`.

### 1. Structural: the failure text was split across two layers (acted on)

`_tes_task_failure` in the runner built "TES task X ended in state Y before Pulsar reported…" and the NOT_FOUND variant. It then called `describe_tes_task_failure(task)` for an executor `summary` and joined the two with an `if failure.summary`. The comment about `Job.info`'s 255-character limit lived in the runner, although the text it constrains is built in the helper. So one message came from two modules, joined by glue code.

Fix: `describe_tes_task_failure(task_id, task_state, task=None, secrets=())` returns `TesTaskFailure(message, executor_stderr, system_logs)`, with `message` complete. It handles NOT_FOUND (no FULL read) and a FULL read that failed (`task=None`). The `Job.info` length note moved to the `message` field's docstring. The runner now fetches the FULL view when the task exists, calls the helper, and logs the system logs. The per-branch early returns and the `full_status` local are gone.

`_tes_known_secrets` became `tes_known_secrets(amqp_url, tes_params)` in the helper. It is pure and belongs with the redaction it feeds, and moving it removed `urllib.parse` from `pulsar.py`.

### 2. File size

`pulsar.py` was already 1588 lines on `release_26.2`. The branch adds about 240 lines, nearly all in the `PulsarTesJobRunner` subclass at the bottom. The TES code there is cohesive and set apart from the shared paths: the only changes to the base runner are a class-attribute indirection for param specs (the same pattern as `destination_defaults` and `client_manager_kwargs`) and a one-line hook. The pure logic is now in `util/tes_task.py`. Moving the runner class out is the remaining decomposition, and see Not acted on for why it waits.

### 3. Spaghetti growth in shared code

The changes outside the TES subclass are minimal and don't branch on TES:

- `runner_param_specs=self.pulsar_param_specs`, so only the TES runner accepts the new options;
- `self._kill_remote_job(...)` at both `client.kill()` call sites.

The base `_update_job_state_for_status` and `stop_job` gain no conditionals. Good.

### 4. Control flow in the TES runner

- `check_watched_item` decides whether a check is due, runs it, catches unexpected errors as a backstop, and drops the watch. `_check_tes_task` is linear: does the job still wait, fetch the state, is it finished, has the grace period passed, check again, then fail. Every exit is a "keep watching" boolean. This reads well.
- `_waits_for_pulsar` and `_runs_task_here` are separate on purpose: the MQ thread needs the second without the first.
- Cross-thread watch creation through `setdefault`, with only the monitor removing watches, is a sound minimal design. The `self.poll` guard in `_update_job_state_for_status` stops watches from piling up when polling is off.
- There are two layers of exception handling: a targeted, redacted warning around the TES fetch, and a `log.exception` backstop around the whole check. The two do different jobs, so this isn't duplication.

### 5. Boundaries and types

- `TesTaskWatch` is a small typed dataclass. `TesTaskFailure` is a NamedTuple with documented fields.
- TES states are plain strings, not `TesState`, because pydantic-tes 0.4.0 lacks PREEMPTED and CANCELING. `TES_TASK_NOT_FOUND` is a pseudo state in the same space, and both state sets are named constants. That is justified until pydantic-tes catches up.
- `TYPE_CHECKING` imports for `TesClient`, `TesTask` and `TesJobParams`. Runtime imports are at module top level.

### 6. Reuse

- The TES client is built with Pulsar's own `parse_tes_job_params` and `tes_client_from_params`, as at submission, rather than bespoke client code.
- Failing goes through the real `fail_job`, with `stop_job = False`.
- No near-duplicate of an existing Galaxy helper was found. `describe_tes_error`, `http_status_code` and the redaction helpers deal with pydantic-tes and Pulsar's argument format specifically.

### Verdict

No structural regression in shared code. The split message assembly was the one clear simplification available, and it's done. The remaining size concern predates the branch and needs a module split that doesn't belong on a release branch.

</details>
