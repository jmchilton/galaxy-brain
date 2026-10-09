# pulsar#525 - Poll for job completion in wsgi_app_test instead of fixed sleeps

- Author: nuwang
- PR: https://github.com/galaxyproject/pulsar/pull/525
- Worktree: `~/projects/worktrees/pulsar/pr/525` (HEAD `6fc0704`, base `origin/master` `8870858`)
- Scope: 1 commit, `test/wsgi_app_test.py` only (+14/-7)
- CI: all green

## Summary

`test_standard_requests` used two fixed 0.3 s sleeps and then read `returncode` from
`/jobs/{id}/status`. The PR replaces them with `_wait_for_complete_status()`, which polls
the endpoint every 50 ms until `complete == "true"`, with a 10 s timeout. The assertions
on the finished job stay the same.

## Verdict

**Approve.** It fixes the real race, the timeout and failure message are sensible, and no
assertion was weakened. The one reuse point below is optional follow-up and shouldn't block.

## Root cause check (verified)

The `KeyError: 'returncode'` comes from the test, not the implementation:

- `pulsar/manager_endpoint_util.py:33-43`: `full_status()` returns only
  `{"complete": "false", "status": ..., "job_id": ...}` until `is_job_done(status)`. That dict has no
  `returncode` key. This is the intended contract: clients check `complete` first.
- `pulsar/managers/stateful.py:366-373`: `__status()` reports `postprocessing` until the
  `postprocessed` metadata file exists. That file is written by a background thread
  (`__handle_postprocessing`, `stateful.py:410-438`), so how long this takes depends on the host.
- The old "call twice" hack partly worked because `get_status()` itself drives the
  `to_complete` transition (`stateful.py:307-329`). Polling keeps that behaviour, and the monitor
  thread can drive it too, so dropping the double call loses nothing.

Waiting on `complete == "true"` is the right condition. It also becomes true for
`failed`/`lost`/`cancelled`, but then the unchanged `returncode == 0` /
`job_stdout` assertions fail with a meaningful value instead of hanging, which is fine.

## Findings

1. **Reuse: this is a fourth copy of `_wait_for`** (`test/wsgi_app_test.py:76-84`). Near-identical
   helpers already exist in `test/stateful_test.py:356`, `test/manager_live_stdout_test.py:545`,
   and `test/messaging_outbox_test.py:38` (the last returns a bool instead of raising). The PR body
   says it "follows the `_wait_for` pattern", but it copies the pattern instead of reusing it.
   The new one is actually the best of the four: it does a final check after the deadline and
   puts the last observed status in the error message. Optional follow-up (here or separately):
   hoist one `wait_for` into `test/test_utils.py` that returns the condition's truthy value, and
   point the three existing copies at it:

   ```python
   # test/test_utils.py
   def wait_for(condition, description, timeout=5, interval=0.01):
       time_end = time.time() + timeout
       while True:
           result = condition()
           if result:
               return result
           if time.time() >= time_end:
               raise AssertionError(f"Timed out waiting for {description}.")
           time.sleep(interval)
   ```

   Then `wsgi_app_test.py` becomes a lambda that returns the status dict when complete. That
   loses the "last status" detail unless the description is a callable, so it's a trade-off, and
   the reason this is non-blocking.

2. No other issues. `time` and `json` were already imported at module top. The inline comment
   (`wsgi_app_test.py:56-57`) is short and explains *why*. Nothing here is a trivial test.

## Test results

Command (from worktree):
`PYTHONPATH=. uv run -q --no-project --with-requirements requirements.txt --with-requirements dev-requirements.txt pytest -q -p no:cacheprovider test/wsgi_app_test.py`

| Ref | Runs | Result |
|---|---|---|
| PR `6fc0704` | 5 | 5/5 passed (1.3-4.6 s; first run includes env setup) |
| `origin/master` `8870858` (temp detached worktree, since removed) | 5 | 5/5 passed |

The intermittent `KeyError: 'returncode'` we saw earlier on master didn't reproduce in these 5
runs. That is expected for a timing race on an unloaded machine (the PR author reports 0/3 on
their host). The code path above confirms that the failure mode is real and that this PR fixes it.
