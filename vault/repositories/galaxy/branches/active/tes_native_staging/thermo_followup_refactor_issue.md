# Share TES task polling between the Pulsar TES runner and the TES-native runner

Galaxy has two runners that follow GA4GH TES tasks: `PulsarTesJobRunner` (`lib/galaxy/jobs/runners/pulsar.py`) and the TES-native `TesJobRunner` (`lib/galaxy/jobs/runners/tes.py`). Cancelling, failure messages and task keys already live in `lib/galaxy/jobs/runners/util/tes_task.py`. Each runner still has its own copy of the polling loop:

- Rate limiting per task: `TesTaskWatch.next_check` in the Pulsar runner, `_next_checks` in the native runner. Both are keyed by `TesTaskKey` and set before the request.
- A TES client built from the destination parameters on every check (`tes_client_from_params(parse_tes_job_params(...))`).
- `fetch_tes_task_state`, with a warning and a retry on any error.
- On failure: a FULL view read, a warning if it can't be read, `describe_ended_tes_task`, system logs to the Galaxy log, and `{"stderr": ...}` as the job's `full_status`.
- Two vocabularies of task states that have to agree: `TES_FINISHED_STATES` / `TES_NOTHING_TO_CANCEL_STATES` in `tes_task.py`, and `TES_WAITING_STATES` / `TES_RUNNING_STATES` in `tes.py`. Today a state that is in none of them (a future TES state, or a server's typo) fails a native job but leaves a Pulsar job waiting.

## Proposal

Add one small helper to `tes_task.py` that owns the schedule and the TES call. It should hold `next check by TesTaskKey`, build the client, and return the task's state when a check is due, or `None` when the task isn't due or the check failed (after logging). Add a second helper that turns an ended task into `(message, full_status)` from a headline. Each runner keeps only its own policy: the Pulsar runner's grace period and `pulsar_reported` handling, and the native runner's mapping from state to job state.

Define every TES state once in `tes_task.py`: waiting, running and ended. The native runner then maps ended states to finish or fail, and states that aren't recognised wait in both runners.

## Why it isn't done yet

The Pulsar TES runner's polling is on `tes_task_state_polling`, which is ready for its own PR. Its review and tests (`test_pulsar_tes_task_checks.py`, about 50 tests) pin the current structure, and rewriting it on a stacked branch would invalidate that review. Do this after both branches land, or fold it into `tes_task_state_polling` before it is opened.

The pydantic-tes changes from the performance review would make this smaller: a `Session`, timeouts on every call, and a MINIMAL `get_task_state`. With them, `fetch_tes_task_state` no longer needs `TesClient._build_url` / `_headers`.
