# pulsar_mq_status_poll — implementation debrief

Revives galaxyproject/galaxy#9911 (2020, WIP; natefoo's idea, rebased by John). One commit `bde5c42735c` on `dev` @ `f763f6cf2ab`, pushed to `jmchilton`. Worked from the Pulsar agent dir (`vault/agents/pulsar/`).

## Blocked on Pulsar
- **galaxyproject/pulsar#532** (draft, branch `jmchilton:fix_mq_status_request_queue`): `MessageJobClient.get_status()` published to `setup`, but Pulsar consumes status requests on `status`. The setup consumer treated the request as a job launch and answered `failed`. With released `pulsar-galaxy-lib` 0.15.15, enabling this branch's polling would fail running jobs.
- Before PR: bump `pulsar-galaxy-lib` in `pinned-requirements.txt` and `pyproject.toml` to the release that has #532. Optionally note the minimum version in the sample config docs.
- #532 also fixes Pulsar dropping the `failed` status when the job directory is unreadable, and collects `state_integration_test.py` in CI (it never ran before).

## What changed (`lib/galaxy/jobs/runners/pulsar.py`)
- **Runner param `status_poll_interval`** (seconds, `0` = off, the default). When it's set:
  - MQ runners start the monitor thread, and MQ jobs stay watched until finished or finishing;
  - RUNNING and STOPPED jobs send `client.get_status()` every interval, and the reply comes back through the existing `__async_update`;
  - QUEUED jobs are never polled, because Pulsar would answer `lost` before it consumes the setup message.
- **`PulsarJobState(AsynchronousJobState)`** holds `last_status_request` (monotonic) and `entry_points_configured`. Nothing is stored in the DB; 9911 touched `job.update_time` on every message.
- **`supports_status_requests`** is True only on `PulsarMQJobRunner` (so also embedded MQ and relay). Elsewhere, setting the param raises `ConfigurationError`.
- **Double-finish protection, which applies with polling off too:**
  - `mark_as_finished` tracks job ids that are mid-finish (lock-protected set, cleared in a `finally`) and ignores repeats. The persisted state stays RUNNING during a normal finish; FINISHING is only set on the celery metadata path.
  - `complete`/`cancelled` are ignored for jobs already OK, ERROR or FINISHING. DELETED/DELETING jobs still finish, since `JobWrapper.finish()` → `fail()` is what cleans them up.
- Sample job confs (YAML + advanced XML) document the param.

## Tests
- **Unit** (`test/unit/app/jobs/test_pulsar_runner.py`): 41 passed, plus the sibling file. Cases written red first:
  - poll timing and the clock reset;
  - queued jobs skipped, stopped jobs polled;
  - finished/finishing jobs dropped, and jobs mid-finish skipped;
  - MQ jobs dropped when polling is off;
  - repeated terminal statuses ignored, and deleted jobs still finish on `cancelled`;
  - the mid-finish set's lifecycle.
- **Integration** (`TestEmbeddedMessageQueuePulsarLostStatusUpdate` in `test/integration/test_pulsar_embedded_mq.py`; runner in new `test/integration/pulsar_mq_runners.py`): the runner drops the first `complete` per job.
  - Red: with the interval at 0, it timed out stuck in `running`.
  - Green: with 2 it passes and asserts exactly one `finish_job`.
  - Needs RabbitMQ (`GALAXY_TEST_AMQP_URL`; I ran a docker `rabbitmq:3` locally).
- **Also passed:** `TestEmbeddedMessageQueuePulsarPurge` and `test/integration/test_job_recovery.py` (3). ruff/black/isort/mypy are clean.
- **Local env:** the worktree `.venv` (py3.13) has the Pulsar #532 branch installed editable in place of `pulsar-galaxy-lib`. Fork CI hasn't run yet; it'll use 0.15.15, which is fine for the tests because only the integration test polls and CI lacks AMQP.

## Review (subagent, [review.md](review.md)) — acted on
- H1, a double finish because FINISHING isn't set normally: fixed with the mid-finish set.
- H2, my first guard skipped deleted-job cleanup: narrowed to OK/ERROR/FINISHING, with a test.
- M3, poll STOPPED jobs: done.
- Integration test: asserts a single finish, and the runner moved to a helper module.
- Commit message corrected.

## Not acted on / follow-ups
- **QUEUED gap.** A job whose `running` message was skipped or lost, and whose `complete` was lost too, still hangs. Polling queued jobs safely would need Pulsar to tell "not set up yet" apart from `lost`.
- **`MessageCLIJobClient`** (destinations with `shell_plugin`) has no `get_status`, so each poll logs a traceback per job. Options: gate on client capability, or add `get_status` to it in Pulsar.
- **Coexecution MQ clients** (K8s/TES/GCP) have no `get_status`. They're gated off by the `ConfigurationError`; adding it would mean querying the backend API on the Pulsar side.
- **`status_cache` leak.** A duplicate reply arriving after the job is OK re-adds a cache entry. Outbox redelivery already causes the same thing on dev.
- **Guest-port jobs** aren't polled until their entry points are configured, and there's no unit test for that path.
- **`ConfigurationError` gate** is untested; it needs a runner built through `__init__`.

## Open questions for John
- Is polling worth it next to Pulsar's outbox plus `amqp_acknowledge`? Is natefoo still interested? (They asked about it in 9911.)
- Close #9911 in favour of this branch once it's a PR?
- Param name `status_poll_interval`: fine?
