Run via gpt-6.1-sol at high effort.

# Codex review: coexecution_stage_out_failures

- Reviewed: `git diff coexecution_client_fixes...HEAD`, parent `coexecution_client_fixes` at `77651c5`, head `bcc3538` (commits `e53af76`, `0f19d22`, `bcc3538`), as restacked on 2026-11-15.
- How: two read-only `codex exec` runs, prompts on stdin (Codex's shell sandbox can't start on this host, so each prompt carried the diff and source). Run A covered fixes 1 and 2 in `stateful.py`/`post.py`, with the full touched files, their tests, `submit_util.py`, `finish.py`, `core.py`, `bind_amqp.py`, `outbox.py`, `manager_endpoint_util.py` and excerpts from `ManagerProxy`/`JobDirectory`. Run B covered fixes 1 and 3 in `post.py`/`down.py`/`models.py`, with their tests, the `do_postprocess`/`stderr_contents` excerpts, `PathHelper`, and the `finish_job` callers (`scripts/run.py`, `client/test/check.py`). Prompts and logs are in `/tmp/claude-1000/coexec-harden-codex-6/`.
- Final head: `bc2d155`.

## Findings

1. **Live output drops the stage-out error** (both runs, P1/P2). CONFIRMED and fixed in `f5c10d9`. `full_status` sets `stderr` to `None` once `is_live_stdout_update` is true (`pulsar/manager_endpoint_util.py:49-52`). The live flush runs before `postprocess`, so no live update carried the `postprocessing_failed` message, and jobs with `send_stdout_update` never showed it. The fix makes `StatefulManagerProxy.is_live_stdout_update` (`pulsar/managers/stateful.py:192`) return false while a failure-message marker holds a message. The completion status then carries both streams, each shrunk to 64 KB with the start and end kept, so the message at the end survives. Galaxy's Pulsar runner uses status streams over the live-written files when they are non-None. The marker loop from the parent's `stderr_contents` moved into a shared `_failure_messages(job_directory)` helper. Test: `test_failed_status_carries_a_stage_out_error_after_streams_were_delivered_live` in `test/manager_live_stdout_test.py` (fails without the fix: `stderr` is `None`).
2. **Recovered terminal markers bypass the publication wait** (run A, P2). CONFIRMED and fixed in `bc2d155`. If Pulsar is killed after writing `postprocessed` but before publishing, the job stays in the postprocessing index. `__recover_postprocessing` (`pulsar/managers/stateful.py:612`) re-stages without clearing the marker, so `get_status` reports the old outcome for the whole retry, and nothing is tracked yet. A client such as `pulsar-finish` could therefore shut down and stop the outbox before the redone outcome is enqueued. In coexecution that only happens when `pulsar-finish` is rerun over the same job directory, but it breaks the invariant fix 2 sets up. The fix removes the marker under the status lock before re-staging, so polling reports `postprocessing` until the new outcome is recorded inside the tracked publication. Test: `test_recovery_reports_postprocessing_until_the_redone_outcome_is_published` in `test/stateful_test.py` (fails without the fix: `complete` instead of `postprocessing`).
3. **Empty output directory still counts as a missing output** (run B, P2). NEEDS-DECISION, not fixed. `JobDirectory.__directory_contents` (`pulsar/managers/base/__init__.py:450`) lists only files, so an empty directory at an output path can't be told apart from a missing output, and the job still ends `ok` with an empty dataset. The status protocol is the same listing on both the server staging and Galaxy `finish_job` paths, so covering this case means changing `outputs_directory_contents` (other consumers download every listed entry) or adding a server-only check. I'd leave it as a documented limitation: a tool that leaves an empty directory at its output path is rare.
4. **Working-directory outputs that are directories skip the check** (run B, P2). REFUTED. `__collect_working_directory_outputs` (`pulsar/client/staging/down.py:81-111`) is pre-existing code this branch doesn't touch. It deliberately collects directories, a feature added in `234d821` ("Support collecting dirs via `from_work_dir`"). Codex wanted it to fail like a local run, but Galaxy's local copy command (`__copy_if_exists_command`, `lib/galaxy/jobs/command_factory.py:336`) tests a non-`_files` destination with `-f` and silently skips a directory source, so a local run doesn't fail there either. One pre-existing divergence, outside this branch's scope: Pulsar writes the files under `<dataset>.dat/` where Galaxy would skip them.

Coverage notes: run A skipped directory detection, which was run B's job, and run B skipped the shutdown logic. Neither ran commands. Run B didn't have Galaxy's runner code; I checked the Galaxy side (`lib/galaxy/jobs/runners/pulsar.py:798-811`) myself.

## Gate

- `make lint`: passed (ruff, all checks passed).
- `.venv/bin/isort --check .`: passed (exit 0).
- `pytest test/stateful_test.py test/submit_util_test.py test/client_staging_test.py test/staging_metrics_test.py test/manager_endpoint_util_test.py test/manager_live_stdout_test.py`: 131 passed. The new recovery test plus the shutdown and recovery tests were rerun 5 times, all green.
- Also run: `test/persistence_test.py test/state_integration_test.py test/messaging_outbox_test.py test/manager_factory_test.py test/capabilities_test.py test/wsgi_app_test.py test/messaging_capabilities_test.py`: 51 passed, 2 skipped. `test/integration_test.py -k "not kubernetes"`: 39 passed, 20 skipped. `test_kubernetes_polling_integration` fails on this host because `~/.kube/config` is missing, unrelated to the branch.
- `mypy` on `pulsar/managers/stateful.py pulsar/managers/staging/post.py pulsar/client/staging/down.py pulsar/client/staging/models.py test/stateful_test.py test/manager_live_stdout_test.py`: no issues.

## Stack notes

- No changes to `pulsar/scripts/submit_util.py`, `pulsar/client/coexecution.py`, `pulsar/client/util.py` or `test/submit_util_test.py`, so `coexecution_compact_launch` should restack cleanly.
- `f5c10d9` refactors the `stderr_contents` marker loop that came from the parent's preprocessing-failure reporting. The behavior is unchanged; only this branch's `stateful.py` is touched.

READY WITH NOTES
