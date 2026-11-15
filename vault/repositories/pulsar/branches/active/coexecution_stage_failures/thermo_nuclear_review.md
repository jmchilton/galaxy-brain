Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: coexecution_stage_failures

Range `git diff coexecution_publish_running...HEAD`: parent `1a741aa`, reviewed head `948fa34` (`8dff9bd` exit codes, `bf0bb7c` preprocessing error in the failed status's stderr, `948fa34` test-only CI fix). I read the surrounding code in `managers/status.py`, `managers/base/__init__.py`, `managers/base/directory.py`, `manager_endpoint_util.py` and `managers/__init__.py`, plus the later stack commits `git log -p 954ab40..coexecution_compact_launch` on the same files.

## Findings

1. **Two mechanisms for reporting why Pulsar failed a job. Fixed in `9df1a10`.** `bf0bb7c` wrote the preprocessing error over the tool's stderr file (`metadata/tool_stderr`). The stage-out counterpart in `coexecution_stage_out_failures` (`eafab6c`) does it differently: the error message goes in the `postprocessing_failed` marker, and a `StatefulManagerProxy.stderr_contents` override appends it to the tool's real stderr. It has to work that way, because overwriting the file there would destroy the tool's output. At the stack tip, the same idea was therefore implemented two ways. The preprocessing side was also not atomic: it wrote the marker, then the stderr file, with an `OSError` guard on the second write that the marker writes didn't have. Now the message goes in the `preprocessing_failed` marker, written in one step, and a `stderr_contents` override appends the message from every marker in `FAILURE_MESSAGE_MARKERS`. Markers older Pulsar versions wrote as `true` still read as failed, without a message. All `preprocessing_failed` readers use `has_metadata`, so their behavior doesn't change. `_record_preprocessing_failure` and the `TOOL_FILE_STANDARD_ERROR` import are deleted. `test_preprocessing_failure_is_reported_once` (`stateful_test.py`) now checks the reported stderr through a plain, non-coexecution manager. The existing submit_util test still checks the published payload.
2. **Unused job-status assignment under `--wait`. Fixed in `cebbe4b`.** `run_server_for_job` stored `wait_for_job`'s return value and set `job_status = None` up front, then returned 0 under `--wait` without reading either. Both are dropped. Now only `wait_for_launch` produces a status, and that makes the always-zero `--wait` policy easy to see. The policy itself is cleanly expressed: one branch at the end, with the Kubernetes reason in the docstring. I didn't relitigate it.
3. **Shared skeleton of `run_server_for_job` / `run_server_for_job_finish`. Refuted.** Both functions build the config, run the app, wrap the work in try/except/finally and return an exit code, but that duplication was there before this branch. The branch adds three matching lines to each. A helper would collide with `2cc2e51`, which changes the config builder lines, and with `9036ff3`, which changes the finish comment, and wouldn't buy much.
4. **`job_status = FAILED` stands for "the script raised". Left as is (minor).** When the job config can't be read, the exit-code helper then logs "Job ended with status [failed]" after the traceback. The log is slightly inaccurate but harmless. Returning directly from `except` would complicate the `--wait` path.
5. **`FAILED_STATUSES` local to `submit_util.py`. Refuted.** `status.py` has no failed-status helper, and `stateful.py` keeps its status tuples local too.
6. **File size. Fine.** `stateful.py` is at 832 lines, `submit_util.py` at about 170.
7. **The `split("//")[1]` host check in the tests. Left as is.** The stage-out tests in the later branches copy the same idiom, so changing it here would only cause conflicts.

Note for the coordinator (later branch, not fixed here): when live output was delivered, `full_status` blanks `stderr`, so the `eafab6c` stage-out message appended by `stderr_contents` is dropped for those jobs. Preprocessing failures are never live-watched, so they're unaffected.

## Hunks changed and restack impact

Scratch simulation: I cherry-picked `954ab40..coexecution_compact_launch` onto `cebbe4b` in a temporary detached worktree (removed afterwards). Onto the original `948fa34` everything applies cleanly.

- `stateful.py` removed the `TOOL_FILE_STANDARD_ERROR` import: no conflict.
- `stateful.py` marker comment and `FAILURE_MESSAGE_MARKERS`: no conflict. When resolving `eafab6c`, change it to `(JOB_FILE_PREPROCESSING_FAILED, JOB_FILE_POSTPROCESSING_FAILED)`.
- `stateful.py` `stderr_contents` override: **conflicts with `eafab6c`** (the same method at the same spot, on purpose, so no duplicate method can slip through). Resolve by keeping the loop version and dropping `eafab6c`'s single-marker body.
- `stateful.py` preprocessing `except` block: **conflicts with `edb84a6`**, which wraps the old block in `__terminal_publications.track()`. Resolve by wrapping the new block (the marker write with its message, `return_code`, then the callback).
- `stateful.py` deleted `_record_preprocessing_failure`: no conflict.
- `test/stateful_test.py` stderr assertion: no conflict.
- `submit_util.py` dropped `job_status = None` and the unused `--wait` assignment: no conflict (`2cc2e51` applies cleanly).

With those two resolutions, `20b6460`, `ea7bc6e` and `9036ff3` applied cleanly. At the simulated tip, `submit_util_test`, `stateful_test`, `manager_endpoint_util_test` and `manager_coexecution_test` passed (76 tests), including the stage-out stderr assertions. Ruff and mypy were clean on `stateful.py`.

## Gate (at `cebbe4b`)

- `make lint`: passed.
- `.venv/bin/isort --check --diff pulsar test`: clean.
- `.venv/bin/mypy` on the stateful, submit_util, submit and finish modules and both test files: no issues.
- `.venv/bin/pytest test/submit_util_test.py test/stateful_test.py test/manager_endpoint_util_test.py test/coexecution_manager_test.py test/scripts_config_test.py test/manager_live_stdout_test.py test/messaging_outbox_test.py`: all passed. `test/manager_coexecution_test.py` and `test/manager_test.py` passed with the venv on `PATH` (10 passed). Without it, `manager_coexecution_test` fails the same way on the original `948fa34` (`python: not found`), so that failure comes from the environment.

Final head: `cebbe4b`.

READY
