Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: coexecution_stage_out_failures

- Reviewed: `git diff coexecution_client_fixes...HEAD`, parent `coexecution_client_fixes` at `77651c5`, head `bc2d155` (commits `e53af76`, `0f19d22`, `bcc3538`, `f5c10d9`, `bc2d155`). I read the surrounding code: `full_status` and live stdout in `pulsar/manager_endpoint_util.py`, `ManagerProxy` in `pulsar/managers/__init__.py`, `ResultsCollector`/`DownloadExceptionTracker`, `PulsarOutputs`, and the existing stateful tests and helpers. The Codex step's findings weren't redone.
- Final head: `24006de`.

## Overall

The design holds up. I looked for a way to delete the terminal-publication tracking, and there isn't one:

- Publishing the callback before writing the marker doesn't work, because the callback's `full_status` reads the marker's message and return code.
- Joining the non-daemon staging threads at shutdown would also wait for transfers in progress, which is different behavior.

So a counter covering exactly the record-then-publish window is the minimal model. `_InFlight` is a small, generic, private class. `stateful.py` ends at 885 lines (877 at `bc2d155`), under the 1k threshold, so moving `_InFlight` into its own module would be churn without a payoff. I left it where it is. Raising `OutputStagingError` instead of returning a bool is an improvement: the caller now gets the message along with the failure. The commit sequence still reads well. `f5c10d9` turns the parent's marker loop into `_failure_messages` at the point where a second caller needs it.

## Findings

1. **The outcome recording was nested five levels deep in the postprocessing closure** (structural). FIXED in `9b83475`. `0f19d22` wrapped the existing persist-then-callback block in `track()` inside `do_postprocess`, and the block already carried two flags (`outcome_persisted`, and `postprocess_success`, which was reassigned on a persist failure) plus a nested try/finally. The fix moves recording and publishing into `__publish_postprocessing_outcome`, whose body is exactly the tracked region. An early return when the outcome can't be persisted removes both flags. Behavior is unchanged: a persist failure still sends FAILED and leaves the job indexed, and a callback exception still clears the postprocessing index only after a persisted outcome. Covered by the existing tests, including `test_postprocessing_publication_failure_notifies_and_remains_recoverable` and the shutdown and recovery tests.
2. **Comments went stale** (legibility). FIXED in `05dc6ea`:
   - In `__recover_postprocessing`, `bc2d155` put the marker removal between the "Unconditional: ..." comment and the restaging call that comment explains. The removal now has its own comment, and the original comment sits back next to that call.
   - `is_live_stdout_update`'s docstring didn't mention the new failure-message condition, which an inline comment carried instead. The docstring now covers it.
3. **The directory output failure was raised only to be caught** (hacky control flow). FIXED in `a38474d`. `with self.exception_tracker(): raise IsADirectoryError(...)` used the tracker's context manager as a way to append to a list. `DownloadExceptionTracker` gained `record(exception)`, which `__call__` also uses, and the collector now calls it directly.
4. **The test helper attached an ad-hoc attribute to an `Event`** (test boundary). FIXED in `24006de`. `_slow_callback` set `publishing.release` on a `threading.Event`. It's now a small `_HeldCallback` class with `started` and `release` events, matching the `_HeldTransfers` helper beside it. I confirmed that the three shutdown and recovery tests still fail when `_InFlight.wait_until_idle` is patched to return immediately.
5. **Duplicate logging of a stage-out failure** (nit). NOT CHANGED. `post.py` still logs `Failures collecting results ...` before raising `OutputStagingError`, and the only caller logs the exception again. The warning keeps the exception types, which the joined message drops, so it's cheap to keep.
6. **Empty output directory** (from the Codex step). Still NEEDS-DECISION. I don't see a clean fix: the outputs listing has files only, and changing it affects every consumer of `outputs_directory_contents`.

## Gate

- `make lint`: passed (ruff, all checks passed).
- `.venv/bin/isort --check --diff .`: passed (exit 0).
- `pytest test/stateful_test.py test/submit_util_test.py test/client_staging_test.py test/staging_metrics_test.py test/manager_endpoint_util_test.py test/manager_live_stdout_test.py test/persistence_test.py test/messaging_outbox_test.py test/state_integration_test.py test/manager_factory_test.py`: 158 passed, 2 skipped.
- Timing-sensitive tests:
  - `stateful_test.py -k "shutdown or recover"`: 5 runs, all green.
  - The shutdown, recovery, live, failed, directory and slow-publish tests across `stateful_test.py`, `manager_live_stdout_test.py` and `submit_util_test.py`: 3 runs, 57 passed each time.
- `test/integration_test.py -k "not kubernetes"`: 39 passed, 20 skipped.
- `mypy` on the four touched modules and `test/stateful_test.py`, `test/client_staging_test.py`, `test/manager_live_stdout_test.py`: no issues.

## Stack notes

None of the new commits touch `pulsar/scripts/submit_util.py`, `pulsar/client/coexecution.py`, `pulsar/client/util.py`, `test/submit_util_test.py` or the compatibility docs, so `coexecution_compact_launch` should restack cleanly. The files changed are `pulsar/managers/stateful.py`, `pulsar/client/staging/down.py` and `test/stateful_test.py`.

READY WITH NOTES
