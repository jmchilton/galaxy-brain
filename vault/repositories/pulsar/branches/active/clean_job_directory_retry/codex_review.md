Run via gpt-6.1-sol at high effort.

# Codex review — `clean_job_directory_retry`

**Summary:** Independent Codex review found one test-coverage gap, now addressed. The retry now reuses Pulsar's `RetryActionExecutor`, the tests use `mock.patch.object`, and lint, format and all 110 manager tests pass.

## Scope

`git diff origin/master...HEAD`, base `08dedcb9bc951a073e173ae6ddb0ef8e9ec9e275`, reviewed head `b39b07b`. Codex CLI 0.169.0, `codex exec -s read-only`, with the findings schema. Its sandbox cannot run shell commands here, so the prompt inlined the diff, a grep of `clean(` / `delete(` / `_finish_execution` / `_write_return_code` / `kill`, and the full text of `pulsar/managers/base/{__init__,directory,external}.py`, `pulsar/managers/{__init__,unqueued,queued,stateful}.py`, `pulsar/managers/util/kill.py`, `pulsar/client/job_directory.py`, `pulsar/web/routes.py`, `test/manager_test.py` and `test/test_utils.py`.

## Findings

1. **P2: the disappearing-file test does not exercise the retry on Python 3.13+** (`test/manager_test.py:106`). **CONFIRMED.** From Python 3.13, `rmtree` skips entries that vanish during the walk: 3.14.4's `_rmtree_safe_fd_step` has `except FileNotFoundError: continue` around `os.unlink`. On that version the pre-fix `clean()` also passes this test. A standalone probe (scratch `race_probe.py`) ran under 3.10.22, 3.11.18 and 3.12.16. On all three the unlink race raises FileNotFoundError, and on 3.12.16 it leaves the directory behind. On 3.14.4 it raises nothing. On 3.10 to 3.12 the test still catches the bug, and CI runs 3.10 to 3.14 (`.github/workflows/pulsar.yaml:56`). Fix: the test comment, the `clean()` comment and the commit message now say this failure happens only before Python 3.13. The test stays, because on 3.13+ it still guards against regressions. 3.13 itself was not installed locally; its behavior comes from the 3.13 `shutil.rmtree` docs and the 3.14 source.

Codex's coverage note said it could not check whether `RetryActionExecutor` suits this use. I checked it under the consistency check below and adopted it.

Tally: 1 confirmed, 0 refuted, 0 needs-decision.

## Consistency check

- **Other `clean()` paths:** none bypass the retry. `BaseManager.clean` (`pulsar/managers/base/__init__.py:140`) is the only implementation. `ExternalBaseManager.clean` (`pulsar/managers/base/external.py:41`) calls `super()`, which covers the cli, drmaa, condor, pbs and slurm managers. `ManagerProxy.clean` (`pulsar/managers/__init__.py:142`) delegates, so `StatefulManagerProxy` gets the retry, as do the queued and coexecution managers. The only other directory removal is `_is_duplicate_setup` (`pulsar/manager_endpoint_util.py:228`). It discards an earlier attempt when a resubmission arrives, so no monitor thread for this job should be running; it was left alone.
- **Canonical layer:** yes, the route (`pulsar/web/routes.py:59`) calls `manager.clean`, and that resolves to `BaseManager.clean`.
- **Shape:** an `onexc` handler that tolerates FileNotFoundError would fix only the vanished-file case. The ENOTEMPTY case (a `return_code` written after the listing) still needs a second pass, so a retry is needed either way. The retry stays, but the hand-rolled loop was replaced by the house abstraction, `RetryActionExecutor` (`pulsar/managers/util/retry.py:23`, already used by the staging actions and `rsh.py`). It is configured with `max_retries=2` and a flat 0.2 s interval: 3 attempts and at most 0.4 s of sleep. As before, clean logs with `log.exception` once the last attempt fails. The executor also logs each retry at info level, as it does for its other users. A scratch check confirmed this path: with `JobDirectory.delete` patched to always raise, `clean()` made 3 attempts in 0.40 s, logged the error and did not raise.
- **Test patching:** wrapping `os.rmdir` / `os.unlink` works on every version probed. Both the fd-based and the plain `rmtree` look up those module attributes at call time. On 3.12.16+ and 3.14, the dispatch `func is os.rmdir` compares the patched object with itself, because the patch covers the whole call. The final `rmdir` receives the full top-level path (dir_fd None), so the path comparison in the test holds. The tests now use `unittest.mock.patch.object(os, ..., side_effect=...)`, the idiom of this test suite, instead of hand assignment with try/finally. `remove_metadata` uses `os.remove`, a separate attribute, so the unlink hook does not recurse.
- **Upstream #554** (TERM, then up to 5 s grace, then KILL): the fix still holds and is still needed alongside it. With #554, `kill()` returns once the process tree has exited or been killed. The monitor thread's `proc.wait()` wakes at about the same moment, so its `return_code` write and pid removal still run concurrently with a DELETE sent right after the cancel. If anything, the overlap becomes more likely. Writes from EXIT traps that run during the grace period finish before `kill()` returns, so they don't widen the race.
- **Residual (not changed):** if the monitor thread runs more than about 0.4 s late, clean can still fail, but it now logs the failure. Once clean has removed the directory, a late `_write_return_code_if_unset` fails inside the monitor thread rather than recreating the directory, which is behavior from before this branch. As the implementation debrief already says, making `kill()` wait for the monitor thread would close the race fully.

## Changes

Folded into the single commit with `--amend`. The new head is `fce7c34b1634bb60e301afccf9de21c55cc7ba72` (was `b39b07b`). It was not pushed.

- `pulsar/managers/base/__init__.py`: `CLEAN_RETRY_EXECUTOR = RetryActionExecutor(...)` replaces `CLEAN_ATTEMPTS` / `CLEAN_RETRY_SECONDS` and the hand-rolled loop. The `time` import is dropped. The comment now gives the Python version for the vanished-file failure.
- `test/manager_test.py`: the tests use `mock.patch.object` and carry the 3.13+ note. The `os.path` import now follows isort style; `tox -e format` failed on it at `b39b07b`.
- The commit message describes the executor and the version, and gains the `Claude-Session` trailer.

## Gate

- `make lint` (ruff): OK. `tox -e format` (isort): OK (it failed at `b39b07b`). `mypy pulsar/managers/base/__init__.py`: no issues.
- `pytest test/manager_test.py test/manager_queued_test.py test/manager_coexecution_test.py`: 14 passed.
- `pytest test/manager_*test*.py -k "not kubernetes"`: 110 passed, 3 skipped.
- With only `clean()` temporarily reverted to the pre-fix single delete, both new tests fail (2 failed). With the fix restored, both pass.
