Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review — `clean_job_directory_retry`

**Summary:** Thermo-nuclear review found no structural problems, only comment redundancy, now trimmed; the retry shape, its layer and the two race tests hold up, and lint, format, mypy and all 110 manager tests pass.

## Scope

`git diff origin/master...HEAD`, base `08dedcb`, reviewed head `fce7c34b1634bb60e301afccf9de21c55cc7ba72`. I read the surrounding code: `BaseManager.clean` and `JobDirectory.delete` (`pulsar/managers/base/__init__.py`), `pulsar/managers/util/retry.py`, the other `RetryActionExecutor` users and `JobDirectory.delete` callers, and `test/manager_test.py`.

## Findings

1. **Minor, accepted: the module comment on `CLEAN_RETRY_EXECUTOR` repeats `clean()`'s.** It said only "see clean". The executor's `description` already names what it retries, and the reason belongs at the call site. Removed.
2. **Minor, accepted: the four-line comment in `clean()` restated the commit message.** It walked through both rmtree failure modes and the Python 3.13 difference. That detail already lives in the commit message and in the two tests' comments, next to the hooks that reproduce each mode. The comment now says in two lines why the retry exists: the monitor thread may still write `return_code` and remove the pid file while rmtree runs.
3. **Declined: move the retry into `JobDirectory.delete()`.** The other caller, `_is_duplicate_setup` (`pulsar/manager_endpoint_util.py:228`), has no monitor thread racing it. A retry there would only add up to 0.4 s of sleep, plus info logging, to failures that a retry cannot fix. The race comes from cancel followed by clean, so the retry belongs in `clean()`. (`JobDirectory` is the manager-side class in `pulsar/managers/base/__init__.py`, not `pulsar/client/job_directory.py`.)
4. **Declined: drop the nested `delete()` closure and pass `job_directory.delete` straight to the executor, with one `exists()` check up front.** It looks like a code-judo move, but it changes behavior. If something else removes the directory between attempts (two cleans of the same job, for example a DELETE racing post-processing), every later attempt raises FileNotFoundError, and `clean()` logs a false error after 0.4 s. The closure is three lines and keeps master's "already gone is fine" contract on every attempt.
5. **Declined: build the executor per call or per manager instead of at module level.** `RetryActionExecutor` holds only fixed configuration, so a module constant is the most direct shape. `stateful.py` and `rsh.py` build theirs in `__init__` only because their settings come from config.
6. **Declined (nit): `interval_max=0.2` is redundant with `interval_step=0`.** The interval stays flat either way, but naming the cap makes "flat 0.2 s" obvious without reading `__fxrange`.
7. **Tests: no change.** The two tests cover different failure modes: a late write makes the final rmdir fail with ENOTEMPTY, and a vanished file makes unlink raise FileNotFoundError. Neither is redundant on Python 3.10 to 3.12, and the second test's comment already says it only guards against regressions on 3.13+. Each test's comment explains why its hook writes or removes that file, which the code doesn't show, so the comments are not obvious ones. Each hook's list does two jobs, a one-shot flag and the assertion that the race was hit, so the tests can't pass vacuously.

Nothing else would be simpler deleted. The diff adds no branching to shared paths, and the file grows from 503 to 517 lines. `clean()` stays the one canonical removal path; `ExternalBaseManager` and the proxies all delegate to it.

Tally: 2 accepted, 4 declined, plus the tests checked and left unchanged.

## Changes

Folded into the single commit with `git commit --amend`, comments only. The message was still accurate and was kept, trailers included. New head `1c8d911e598f283a8d809823b367b67809717c49` (was `fce7c34`). Not pushed.

- `pulsar/managers/base/__init__.py`: removed the comment above `CLEAN_RETRY_EXECUTOR` and cut the `clean()` comment from four lines to two.

## Gate

Python 3.12.16, `.venv/bin` first on `PATH`.

- `make lint` (ruff): all checks passed.
- `tox -e format` (isort): OK.
- `mypy pulsar/managers/base/__init__.py`: no issues.
- `pytest test/manager_test.py test/manager_queued_test.py test/manager_coexecution_test.py`: 14 passed.
- `pytest test/manager_*test*.py -k "not kubernetes"`: 110 passed, 3 skipped.
- I put master's single `delete()` back in `clean()` temporarily. Both new tests failed (2 failed). After restoring the branch's `clean()`, both pass.
