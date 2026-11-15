Run via gpt-6.1-sol at high effort.

# Codex review — `queued_manager_monitor_kwarg`

**Summary:** An independent Codex review (gpt-6.1-sol, high effort) found no defects, a consistency check found no other affected caller, and the local gate passes, so the branch stays at `b476ccd` unchanged.

## Scope

- `git diff origin/master...HEAD`: master `08dedcb`, reviewed head `b476ccd3dfa8d8f13083cf0c094c4a2fa9fbb112`.
- The brief gave only what the change is meant to do, plus house style (Python, imports at module top, tests in `test/`, ruff/isort lint).
- Codex CLI 0.169.0, `codex exec -s read-only` with the codex-review findings schema. Output and logs are in this session's scratchpad (`codex_qmmk/`).

## Runs

1. **No review.** The read-only sandbox couldn't run shell commands (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`; nested namespaces aren't allowed inside the host sandbox), so Codex couldn't read the repository and returned an empty result.
2. **Shallow review.** This run inlined the diff, a `grep` of `_start_monitor` / `_run(` / `MonitorStyle` call sites, and the full text of `pulsar/managers/{queued,unqueued,stateful}.py`, `pulsar/managers/base/{__init__,directory}.py`, `pulsar/core.py`, `test/manager_queued_test.py` and `test/test_utils.py`. At 142 KB the prompt was too big for a command-line argument, so it went in with `codex exec -` from a file on stdin, which closes cleanly. The log header said `reasoning effort: none` because `~/.codex/config.toml` sets no effort. Result: 0 findings.
3. **Counted review.** Same prompt with `-c model_reasoning_effort="high"`; the header says `reasoning effort: high`. Result: 0 findings. Codex's coverage note says it reviewed all eight supplied files, and that tests and lint weren't run because it had no shell.

## Findings

None from Codex, so nothing to confirm or refute.

## Consistency check (own)

- **Other callers of `_start_monitor`.** The only other caller is `CoexecutionManager.launch` (`pulsar/managers/unqueued.py:323`), which already passes `monitor=` by keyword. It works with the new keyword-only signature (`pulsar/managers/unqueued.py:109`).
- **Other callers of `Manager._run`.** The callers are `Manager.launch` (`pulsar/managers/unqueued.py:257`, default `BACKGROUND`) and `QueueManager.run_next` (`pulsar/managers/queued.py:121`). Nothing overrides `_run` or `_start_monitor`. `queued_cli`, `queued_condor`, `queued_drmaa*`, `queued_slurm`, `queued_pbs` and `queued_external_drmaa` derive from `ExternalBaseManager` / `BaseManager`, not `BaseUnqueuedManager`, so the change doesn't touch them.
- **Behaviour the fix brings back:**
  - A job waiting in the queue reports `queued` (`submitted` file, no `pid`; `pulsar/managers/unqueued.py:65-75`).
  - Killing a job that hasn't started records the cancel and drops `submitted`, and the worker then skips it (`_run` checks `_was_cancelled`, `pulsar/managers/unqueued.py:219-221`).
  - On `shutdown`, jobs still in the queue keep their `command_line` file, so `_recover_active_job` re-queues them at the next boot.
  - Workers are daemon threads, so a long running job only makes `shutdown(timeout)` log a warning; it doesn't hang the exit.
  - This is the behaviour from before 0.15.0.
- **Test robustness.** The new test has no timing tolerance:
  - The second job's Python process starts only after the first worker's `_monitor_execution` returns, so with the fix `end1 <= start2` holds by construction, on one wall clock.
  - The 15 s `wait_for` per job leaves plenty of headroom over about 4 s of runtime on slow CI.
- **Outside this change.** The existing `PythonQueuedManagerTest.tearDown` calls `super().setUp()` instead of `super().tearDown()`, so the staging directory isn't removed. Not touched here; not fixed.

## Changes

None. Head stays at `b476ccd3dfa8d8f13083cf0c094c4a2fa9fbb112`.

## Local gate (at `b476ccd`, `.venv/bin` on `PATH`)

- `make lint` (ruff): passed. `tox -e format` (isort): passed. `mypy pulsar/managers/queued.py pulsar/managers/unqueued.py`: no issues.
- `pytest test/manager_queued_test.py`: 3 passed.
- `pytest test/manager_*test*.py test/coexecution_manager_test.py -k "not kubernetes"`: 118 passed, 3 skipped, 1 deselected.
- `pytest test/integration_test.py -k "not kubernetes"`: 39 passed, 20 skipped, 4 deselected (56 s).
