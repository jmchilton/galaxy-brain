Fix `DELETE /jobs/{id}` leaving a just-cancelled job's directory behind while answering 200.

A TES server on Pulsar (tesp-api) cancels a running task with `PUT /jobs/{id}/cancel` and then calls `DELETE /jobs/{id}`. Over 40 cancels of running tasks, its Pulsar kept these job directories:

| Pulsar | Directories left after cancel + delete |
| --- | --- |
| master (with #575) | 13 of 40 (7 holding only `return_code`, 6 whole) |
| this branch | 0 of 40 |

`kill()` signals the process tree and returns. The thread waiting for the job's process then writes `return_code` and removes the pid file, often while the DELETE's `clean()` runs `shutil.rmtree`. rmtree fails in two ways:

- `return_code` appears after rmtree listed the directory, so the final `rmdir` fails on a non-empty directory and `return_code` stays.
- Before Python 3.13: the pid file disappears before rmtree unlinks it, so rmtree raises `FileNotFoundError` and stops, and the whole directory stays.

`clean()` swallowed the exception, so the directory stayed and the client never knew. A second DELETE removed it, after which the job's status went from `cancelled` to `lost`.

`clean()` now removes the directory through Pulsar's existing `RetryActionExecutor`: up to three attempts, 0.2 s apart, treating an already-missing directory as success. A final failure is logged with its traceback instead of being dropped silently. Two deterministic tests in `test/manager_test.py` inject each race by wrapping `os.rmdir` and `os.unlink`. Both fail on master's `clean()`. The `FileNotFoundError` test only catches the bug on Python 3.10–3.12, because rmtree tolerates a vanished file from 3.13 on.

<details><summary>Not done</summary>

- Making `kill()` wait for the monitor thread. That would close the race completely, including a DELETE sent without a cancel, but it changes how quickly the cancel route answers.
- Making DELETE answer an error when the directory stays. That would change the API.

If the monitor thread runs more than about 0.4 s late, `clean()` can still fail, but now it logs the failure.

</details>

## Risks

Risks are minimal. This only changes how hard `clean()` tries before giving up, so it's easy to revert (a two-way door).

<details><summary>Risk Details</summary>

- In the worst case, a DELETE whose directory can't be removed now takes about 0.4 s longer to answer.
- Removal failures that used to be silent (e.g. permission errors) now log one error with a traceback. Each retry also logs at info level, as `RetryActionExecutor` does for its other users.

</details>

## Context

Found alongside #575 while running Pulsar as the job backend of the community tesp-api TES server, as part of an investigation of Galaxy with GA4GH WES and TES. The two fixes are independent; this branch is based on master. It is still needed alongside #554: with TERM-first cancellation, `kill()` returns as the processes exit, and the monitor thread's writes race a following DELETE just the same.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>An independent Codex review found one test-coverage gap; the retry now reuses <code>RetryActionExecutor</code>.</summary>

Codex noted that from Python 3.13 rmtree skips a file that vanishes mid-walk, so the `FileNotFoundError` test can't catch the bug there. A probe under 3.10–3.12 and 3.14 confirmed it. The test was kept, because CI runs 3.10–3.14, and its comment and the commit message now say this failure only happens before 3.13. The hand-written retry loop was replaced with Pulsar's existing `RetryActionExecutor`, with the same behaviour, and the tests now use `mock.patch.object`. A consistency check found every manager's `clean()` goes through `BaseManager.clean`, so all managers get the retry. Local gate: `make lint`, isort and mypy pass. Manager tests: 110 passed, 3 skipped. With master's `clean()`, both new tests fail.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/clean_job_directory_retry/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural problems; only redundant comments were trimmed.</summary>

The retry stays in `clean()`, not in `JobDirectory.delete()`: the other caller of `delete()` has no thread racing it. The "already gone is fine" check stays inside each attempt, so two cleans of the same job don't log a false error. The two race tests cover different failures and are kept as they are. Gate after the change: lint, isort and mypy pass. Manager tests: 110 passed, 3 skipped. Both new tests still fail with master's `clean()`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/clean_job_directory_retry/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
