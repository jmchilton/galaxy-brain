Fix three stage-out failure modes: Galaxy can't see why stage-out failed, a directory where an output file should be gives a green job, and a terminal status can be lost at shutdown.

> **Stacked on 🔀 #581** (on #580, #579, #578 and #577). This PR's own commits are the last nine, from `e53af76` to `24006de`. Review the three fixes first: `e53af76` (stage-out error in `stderr`), `0f19d22` (publish before shutdown) and `bcc3538` (directory outputs). `f5c10d9` and `bc2d155` fix review findings on top of them, and the last four are cleanups. Most of the change is in `pulsar/managers/stateful.py`.

| Case | `master` | this branch |
| --- | --- | --- |
| Galaxy unreachable when `pulsar-finish` uploads outputs | `failed`, `stderr` = the tool's stderr only. Galaxy shows "Remote job server indicated a problem running or monitoring this job." | `failed`, `stderr` ends with `Pulsar failed to stage outputs: Connection refused …` |
| Galaxy answers 500 to an upload | same | `… Pulsar failed to stage outputs: Response code not 200 (transport code: 500, …)` |
| The tool replaced its output file with a directory | job `ok`, empty dataset | job `failed`: `Pulsar failed to stage outputs: Output dataset_2.dat is a directory, not a file` |
| `pulsar-finish` shuts down while the terminal status is still being published | only `running` ever reaches Galaxy, and the job stays `running` | shutdown waits, and `complete` is published |

A local Galaxy runner fails the directory case too ("Unable to finish job", an `IsADirectoryError`), so before this change Pulsar was the odd one out. A *missing* output is deliberately unchanged, because a local Galaxy runner with default config also ends `ok` with a 0-byte dataset.

<details><summary>1. Stage-out errors in the failed status (<code>e53af76</code>, <code>f5c10d9</code>)</summary>

`postprocess` raises `OutputStagingError`, which carries the collection failures, instead of returning `False`. The `postprocessing_failed` marker holds `Pulsar failed to stage outputs: <error>` rather than `true`. It joins the failure-message markers that `StatefulManagerProxy.stderr_contents` appends after the tool's stderr. That mechanism comes from #579, and #579 uses it for preprocessing failures. The tool's own stderr file is never modified. A later successful attempt removes the marker, so a recovered job reports no stale error, and a `true` marker from an older Pulsar still reads as failed.

`full_status` blanks the streams once live stdout updates have delivered them. That would drop the message, because postprocessing runs after the last live flush. So `is_live_stdout_update` is false while a failure marker holds a message, and the completion status carries the streams, each truncated to 64 KB with the start and end kept (`f5c10d9`).

</details>

<details><summary>2. A terminal status lost at shutdown (<code>0f19d22</code>, <code>bc2d155</code>)</summary>

The stateful manager writes the `postprocessed` marker, or `preprocessing_failed`, before publishing the terminal status, and `get_status` reports a terminal status as soon as the marker exists. `pulsar-finish` polls `get_status`, so it could shut the app down and stop the outbox before the staging thread enqueued the message. In a TES task nothing sends it later. To reproduce, slow `full_status` for `complete` to 3 s: a real `pulsar-finish` published only `['running']`.

The manager now counts terminal publications in progress (`_InFlight`), from just before the marker is written until the callback returns. `shutdown` waits for the count to reach zero after stopping the monitor and before the proxied manager and the outbox stop. It doesn't wait for transfers still running. Recovery of an interrupted postprocessing now clears the stale `postprocessed` marker before restaging, so `get_status` can't report the old outcome while the new one isn't tracked yet (`bc2d155`).

</details>

<details><summary>3. Directory outputs (<code>bcc3538</code>)</summary>

`has_output_file` only matched files, so `ResultsCollector` treated a directory at an output path as a missing output and skipped it. It now records `Output <name> is a directory, not a file` as a collection failure, so the job fails through #1. This holds whether Pulsar stages outputs itself or Galaxy collects them with the same `ResultsCollector`. An *empty* directory at an output path is still not noticed, because the outputs listing contains files only.

</details>

<details><summary>Tests</summary>

| Test | Parent code | this branch |
| --- | --- | --- |
| `stateful_test::test_failed_status_reports_the_stage_out_error_after_the_tool_stderr` | message missing | passes |
| `stateful_test::test_stage_out_error_is_dropped_once_outputs_are_staged_on_recovery` | stale | passes |
| `submit_util_test::test_finish_output_staging_failure_publishes_failed_and_exits_non_zero` (extended) | empty `stderr` | passes |
| `manager_live_stdout_test::test_failed_status_carries_a_stage_out_error_after_streams_were_delivered_live` | `stderr` is `None` | passes |
| `stateful_test::test_shutdown_waits_for_a_reported_postprocessing_outcome_to_be_published` / `..._preprocessing_failure_...` | shutdown returns while the callback is held | passes |
| `stateful_test::test_recovery_reports_postprocessing_until_the_redone_outcome_is_published` | `complete` during the retry | passes |
| `submit_util_test::test_finish_publishes_complete_even_when_publishing_is_slower_than_polling` | `['running']` | passes |
| `client_staging_test::test_collect_outputs_fails_an_output_written_as_a_directory`, `submit_util_test::test_finish_fails_an_output_written_as_a_directory` | no failure, exit 0 | passes |

An earlier revision of the three fixes was also checked with Docker, with `docker run --read-only` executors against a throwaway RabbitMQ and a fake Galaxy job files API, which produced the messages in the table above. It was also checked end to end through Galaxy v26.1.2 on Funnel and TESK, where the job's stderr named the stage-out error and a directory output failed the job.

</details>

## Risks

Moderate and two-way: no data or format migration, but `stateful.py` is shared by every Pulsar manager.

<details><summary>Risk Details</summary>

- `postprocess` now raises instead of returning `False`. The stateful manager is its only caller in Pulsar.
- `shutdown` can block for as long as an in-flight terminal publication takes. That is normally milliseconds, but a callback stuck on an unreachable broker holds shutdown up to the configured timeout.
- A job whose tool wrote a directory at an output path now fails, on every manager, where it used to end `ok` with an empty dataset.
- A failed job that streamed live stdout now sends its streams again in the final status, up to 64 KB each.
- The `postprocessing_failed` marker's value changes from `true` to a string. Readers check for presence, and `true` is still accepted.

</details>

<details><summary>Risk Review Advice</summary>

Spend the time on `stateful.py`: the `_InFlight` window in `__publish_postprocessing_outcome` and in the preprocessing-failure path, and its ordering in `shutdown`. Also look at the recovery change, which removes a marker before restaging. A reviewer should agree that turning a directory output into a failure is the right policy, which matches what a local Galaxy runner does.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK) through Pulsar coexecution. Builds on 🔀 #579, whose failure-message markers this reuses for stage-out.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression. Four cleanups, the main one pulling the outcome publication out of a five-level closure.</summary>

- The review looked for a way to delete the terminal-publication tracking and found none. Publishing before the marker breaks `full_status`, and joining staging threads would wait for transfers in progress.
- Recording and publishing the postprocessing outcome moved into `__publish_postprocessing_outcome`, whose body is exactly the tracked region. Two flags are gone.
- The directory failure is recorded with a new `DownloadExceptionTracker.record()` instead of raising and catching an exception. Stale comments were fixed, and a test helper got its own small class.
- `stateful.py` ends at 885 lines.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_stage_out_failures/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two confirmed bugs fixed with tests, one refuted, one left open (empty output directories).</summary>

- Fixed: live stdout delivery made `full_status` drop the stage-out error (`f5c10d9`).
- Fixed: recovery of an interrupted postprocessing reported the stale outcome outside the publication wait (`bc2d155`).
- Refuted: directories collected from the working directory skip the new check. That's a deliberate existing feature, and Galaxy's local copy skips them too.
- Open: an empty directory at an output path still looks like a missing output.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_stage_out_failures/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
