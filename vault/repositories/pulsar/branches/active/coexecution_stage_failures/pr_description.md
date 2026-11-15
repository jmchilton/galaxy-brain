Fix coexecution staging failures exiting 0, which leaves TES tasks running and hides the error from Galaxy.

> **Stacked on 🔀 #578** (itself on #577). This PR's own commits are the last four: `8dff9bd`, `f2789fc`, `ac3a883` and `1302eea`. Review `8dff9bd` (exit codes) and `f2789fc` (the error in the failed status) first; the other two are a test-only fix for CI and a small cleanup.

In a TES task, Galaxy's Pulsar runner runs three executors in order: `pulsar-submit --no-wait`, the tool container (which waits for Pulsar to write the job's `command_line`) and `pulsar-finish`. Galaxy learns the job's state only from Pulsar's status messages. On `master` both Pulsar scripts catch every exception, log it and exit 0.

| Failure | `master` | this branch |
| --- | --- | --- |
| Stage-in fails (Galaxy unreachable) | `pulsar-submit` exits 0. The tool executor waits for a `command_line` that is never written. `failed` is published with empty `stderr` | `pulsar-submit` exits 1 and the task stops. `failed` carries `stderr: Pulsar failed to stage inputs or launch the job: Connection refused …` |
| Stage-in fails and the broker is down too | exit 0, nothing published, task runs until timeout | exit 1, so the TES task ends `EXECUTOR_ERROR` |
| Stage-out fails (upload error) | `pulsar-finish` exits 0, task `COMPLETE` | `pulsar-finish` exits 1 |

On `failed`, Galaxy shows only the status's `stdout` and `stderr`, so on `master` users saw "Remote job server indicated a problem running or monitoring this job." and nothing else. The preprocessing error was written to a job file named `stderr`, which nothing has read since tool streams moved to `metadata/tool_stderr`.

<details><summary>What changed</summary>

- **Exit codes (`8dff9bd`).** `pulsar-submit --no-wait` and `pulsar-finish` return 1 when the script raised or the job ended `failed` or `lost`; `main()` returns the code to the console-script wrapper. The `failed` status is still published by the stateful manager. The exit code doesn't depend on that publish succeeding, so an unreachable broker still stops the task. `pulsar-submit --wait` keeps exiting 0: Kubernetes runs it in a Job, which replaces a failed pod (`backoffLimit` defaults to 6) and would run the job again after Galaxy was told it failed. The docstring says so.
- **The error in the failed status (`f2789fc`).** The `preprocessing_failed` marker now holds the message instead of `true`, written in one step. `StatefulManagerProxy.stderr_contents` appends the message of each failure marker after the tool's stderr. This applies to every stateful manager, not just coexecution. Markers written as `true` by older versions still read as failed, without a message. A follow-up PR reports stage-out errors through the same list of markers.
- **`ac3a883`** makes a stage-out test stop depending on the test job files server stopping, since CI points `files_server()` at a standing external server. **`1302eea`** drops a job status the `--wait` path never read.

</details>

<details><summary>Tests</summary>

`test/submit_util_test.py` drives the real `pulsar-submit` / `pulsar-finish` entry points with a `memory://` broker unless noted:

| Test | `master` scripts | this branch |
| --- | --- | --- |
| `test_no_wait_submit_unreachable_galaxy_publishes_failed_and_exits_non_zero` | exit `None`, empty `stderr` | passes |
| `test_finish_output_staging_failure_publishes_failed_and_exits_non_zero` | exit `None` | passes |
| `test_no_wait_submit_failure_exits_non_zero_with_unreachable_broker` (AMQP URL on a closed port) | exit `None` | passes |
| `test_no_wait_submit_preprocessing_failure_publishes_failed_only` | exit `None` | passes |
| `test_waiting_submit_failure_still_exits_zero` | documents `--wait` | passes |

`test_preprocessing_failure_is_reported_once` in `test/stateful_test.py` also checks that the reported stderr carries the message through a plain, non-coexecution manager.

An earlier revision of this branch, which wrote the same message to `metadata/tool_stderr` instead of the marker, was also checked with Docker against a throwaway RabbitMQ, using `docker run --read-only` executors with Galaxy-shaped arguments. It was also checked end to end through Galaxy v26.1.2 on Funnel, where a stage-in failure failed the Galaxy job within 6 to 8 s, with the error in its stderr.

</details>

## Risks

Low, and two-way: exit codes and an extra stderr line are easy to revert.

<details><summary>Risk Details</summary>

- Any wrapper that ran `pulsar-submit --no-wait` or `pulsar-finish` and treated a non-zero exit as fatal now sees failures that used to be hidden. That is the point of the change.
- The `preprocessing_failed` marker's value changes from `true` to a string. All readers check only whether the marker exists, and the new reader accepts both values.
- The failed status's `stderr` gains a trailing line for preprocessing failures on every stateful manager, not just coexecution.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that keeping `pulsar-submit --wait` at exit 0 is still the right policy for Kubernetes. Check the `stderr_contents` override in `stateful.py`, the one place the message is joined to the tool's stderr.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK) through Pulsar coexecution. Builds on 🔀 #578, whose `wait_for_launch` gives `pulsar-submit` the status it turns into an exit code.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Unified how Pulsar reports why it failed a job, and dropped an unused status.</summary>

- The preprocessing error used to overwrite the tool's stderr file. The stage-out counterpart in a follow-up PR can't do that without losing the tool's real stderr, so the same idea would have been implemented two ways. Now both report through messages stored in failure markers, which `stderr_contents` appends. Writing the message in the marker also made the write atomic.
- `run_server_for_job` stored a status under `--wait` that it never read. That's gone, which makes the always-zero `--wait` policy easier to see.
- Refuted: extracting a shared skeleton from the submit and finish functions (pre-existing duplication) and moving `FAILED_STATUSES` into `status.py`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_stage_failures/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings in two runs.</summary>

Codex got the diff, the full post-change scripts, `stateful.py` and tests, and the surrounding manager, messaging and client code. Neither run reported anything to fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_stage_failures/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
