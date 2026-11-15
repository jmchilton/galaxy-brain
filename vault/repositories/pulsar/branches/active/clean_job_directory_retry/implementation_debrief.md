# Implementation debrief — `clean_job_directory_retry`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 6 coordinator, item H2b follow-up). Base `queued_manager_monitor_kwarg` `b476ccd3dfa8d8f13083cf0c094c4a2fa9fbb112` (master `08dedcb` + the `montior` fix); head `ffbe6987cd84b79ff08a4c6cd9d45ec2f04de408`.

## Problem

Stage 6 acceptance on tesp-api found a canceled task whose outer Pulsar job directory stayed after tesp-api's `PUT /jobs/{id}/cancel` and one `DELETE /jobs/{id}`, holding only `return_code`.

- `Manager.kill()` (unqueued and queued_python) records the cancel and signals the process tree (`kill_pid`), then returns.
- The thread that waits for the job's process (`_monitor_execution`) then writes `return_code` (`_write_return_code_if_unset`) and, under the job lock, removes the pid file (`_finish_execution`). Neither step takes part in `clean()`.
- `BaseManager.clean()` called `job_directory.delete()` (`shutil.rmtree`) once and ignored any exception.
- If `return_code` appears after rmtree listed the directory, the final `rmdir` fails (ENOTEMPTY): the directory stays with `return_code` only.
- If the pid file disappears before rmtree unlinks it, rmtree on Python 3.12 raises FileNotFoundError and stops: the whole directory stays.
- Either way `DELETE` answers 200.

Live, with tesp-api's outer Pulsar (`b476ccd`, Python 3.12.16) and tesp-api `82c57ebf` (patch 0016, one erase per job): 13 directories left in 40 cancels of running tasks. 7 held `return_code` only and 6 were whole. A second `DELETE` removed a whole one at once, and its status went from `cancelled` to `lost`.

## Fix

`BaseManager.clean()` tries `delete()` up to 3 times (`CLEAN_ATTEMPTS`), 0.2 s apart (`CLEAN_RETRY_SECONDS`). It stops once the directory is gone, and logs with `log.exception` if the last attempt fails. The thread changes the directory twice, within milliseconds of the process ending, so a retry after 0.2 s finds it quiescent.

Not done:

- Making `kill()` wait for the monitor thread. That would also cover a DELETE without a cancel, but it changes the latency of the cancel route.
- Making DELETE answer an error when the directory stays. That would change the API.

## Testing

Two tests in `test/manager_test.py` reproduce the race deterministically:

- `test_clean_removes_a_file_written_while_the_directory_is_removed` wraps `os.rmdir`: it writes `return_code` into the directory just before rmtree's final rmdir of it.
- `test_clean_survives_a_file_removed_while_the_directory_is_removed` wraps `os.unlink`: it removes the pid file just before rmtree unlinks it.

| Run | Result |
|---|---|
| New tests on `b476ccd`'s `pulsar/managers/base/__init__.py` | 2 failed, directory still there (`runs/stage6/tesp-erase-race/pulsar-fail-before-b476ccd.txt`) |
| New tests with the fix | 2 passed |
| `test/manager_test.py`, `manager_queued_test.py`, `manager_coexecution_test.py`, venv first on `PATH` | 15 passed |
| `make lint` | passes |

Live (`runs/stage6/tesp-erase-race/`): the race loop against tesp-api `01bbf9b` (0016 without 0017) with the outer Pulsar built from this branch (`wes-tes/tesp-pulsar-rest:git-ffbe6987cd84-docker29.1.3`). 0 of 40 cancels left a directory (`pulsar-fix-only-01bbf9b-ffbe698-40-cancels.json`), against 13 of 40 on `b476ccd` (`before-82c57ebf-40-cancels.json`); Pulsar logged no `Failed to remove the directory`.
