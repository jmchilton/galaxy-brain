# Review: consolidate test `wait_for` (galaxyproject/pulsar#527)

Branch: `~/projects/worktrees/pulsar/branch/consolidate-test-wait-for`, commit `0f01433` on origin/master (fetched 2026-09-30).
Reviewed 2026-09-30.

## Verdict

Good change. Mergeable after fixing the misleading timeout descriptions. The helper is small, it replaces four copies, and its return-value and last-value features pay off at the call sites. I found no behavior regressions except a small tightening of the cancel-check bound. `wait_for` checks the deadline after each poll, while the old `_wait_for` copies checked it before. So `wait_for` always polls at least once and polls one more time after the deadline, which makes it slightly more lenient than what it replaces.

## Verification

- Target suites (`wait_for_test`, `stateful_test`, `manager_live_stdout_test`, `messaging_outbox_test`, `wsgi_app_test`, `manager_test`): 72 passed, 5.3s.
- `manager_queued_test`/`manager_test -k cancel`: passes.
- `ruff check test/`: clean. `isort --check-only test/`: clean. `mypy test/test_utils.py test/wait_for_test.py`: clean.
- The top-level import of `test_pulsar_app` into `wsgi_app_test.py` does not get collected as a test (checked with `--collect-only`). `integration_test.py` already imports it at top level.

## Call-site behavior

| Site | Old | New | Preserved? |
|---|---|---|---|
| `stateful_test._wait_for_callback` / `_wait_for_postprocessing_index_cleared` | 5s, 0.01, named | same | yes |
| `manager_live_stdout_test` (6 sites) | 5s, 0.01, generic msg | 5s, 0.01, named + last value | yes; `is False` kept via `until=lambda d: d is False` (`:447-451`) |
| `messaging_outbox_test` (8 sites) | 5s/10s, **0.02**, returns bool, `assert` | 5s/10s, **0.01**, raises | timeouts yes; interval halved (harmless) |
| `wsgi_app_test._wait_for_complete_status` | 10s, 0.05, returns status | 10s, 0.05, returns status | yes (message now says "last value" not "last status") |
| `_assert_status_becomes_cancelled` | 100 iterations × (get_status + 0.01s) | 1s wall clock | fail-fast on complete/failed preserved; bound tightened, see below |

## Findings

### should-fix: timeout descriptions describe the polled quantity, not the awaited state

The message template is `Timed out after {t}s waiting for {description}, last value: {v}.`. In stateful_test, wsgi_app_test and part of live_stdout, the descriptions name the target state ("the postprocessing index to be cleared", "job 12345 to complete", "delivered to be reset"). Elsewhere they name the polled value, so the failure text says the opposite of what happened:

- `test/messaging_outbox_test.py:45,65,89,106`: `"pending updates"` with `until=n == 0` renders as *"waiting for pending updates, last value: 1"*. A reader would take that as waiting for updates to appear, when the test was waiting for the outbox to drain. Suggest `"the outbox to drain"`, and for `:56,81` `"1 pending update"` / `"2 pending updates"`.
- `:44,152`: `"publish calls"` → `"one publish call"`; `:168` `"published payloads"` → `"one published payload"`.
- `test/manager_live_stdout_test.py:493`: `"a post per job"` is fine. `:562,610` `"live stdout"` / `"stdout before restart"` are borderline; `"the live stdout to be posted"` is clearer.

Pick one convention (target state, since the template reads "waiting for X") and use it everywhere.

### should-fix: cancel-check bound tightened from about 1s + poll cost to a strict 1s (`test/test_utils.py:255-262`)

The old loop counted 100 iterations, and each iteration was a `get_status` plus a 0.01s sleep, so the real bound was over 1s and grew with the cost of `get_status`. The new check uses `timeout=1` on wall-clock time. `_test_cancelling` runs against `manager_test`, `manager_queued_test` and `manager_drmaa_test`. The drmaa case and a loaded CI box are where this could turn flaky. `timeout=2` keeps the intent ("cancels quickly") and removes the regression risk. The new failure message (`last value: 'running'`) is an improvement over "Job failed to cancel quickly."

Minor issue in the same place: the lambda parameter `status` shadows the local `status` it is assigned to. Rename it to `s`, or name the result `final`.

### nit: missed conversions in `test/integration_test_state.py`

These are in scope and are not part of the resilience extraction:

- `:263-268` `wait_for_messages`: this is a clear duplicate, and it has an accounting bug. It sleeps `.1` but adds `0.05` to the counter, so the "3s" limit is really about 6s, and it raises a generic `Exception`. `wait_for(lambda: len(self.messages) >= n, f"{n} status message(s)", timeout=3)` (or 6, to keep the current real bound) fixes both.
- `:40-47`: the external-id loop (10 × 0.05s) becomes `external_id = wait_for(lambda: manager._proxied_manager._external_id(job_id), "an external id", timeout=0.5)`. It is a kombu+drmaa integration test, so it's lower priority, but the loop is the same pattern.

These are reasonably out of scope:

- `test_utils._test_simple_execution:228`: no default timeout, and it busy-spins without sleeping. It could use `wait_for(..., timeout=timeout or math.inf)`, but that changes semantics. Leaving it for a separate change is fine.
- `amqp_test.py:69` (`while self:`): waits for the consumer thread to stop, not for a condition with a timeout. `manager_coexecution_test.py:19`: a thread body, not a test wait.
- `test/resilience/scenarios/test_capabilities_publish.py:28,89`: being extracted separately.
- Fixed `time.sleep(1)` in `persistence_test.py:95,118`: these wait for recovery side effects. They could become `wait_for(lambda: exists(touch_file), ...)`, but the sleep sits inside the manager lifecycle helpers, so that is a restructure rather than a helper swap. It's worth a follow-up issue, not this PR.

### nit: `if until(value) if until else value:` (`test/test_utils.py:90`)

A conditional expression inside an `if` reads like a typo on first pass. Suggest:

```python
done = until(value) if until else value
if done:
```

### nit: `stateful_test._wait_for_postprocessing_index_cleared` still uses the boolean form (`test/stateful_test.py:364`)

`lambda: _postprocessing_job_ids(proxy) == []` loses the last-value reporting the new API offers. `wait_for(lambda: _postprocessing_job_ids(proxy), ..., until=lambda ids: ids == [])` would report which job ids were stuck. It's a small diagnostic gain and matches the live_stdout conversions.

### nit: typing

`Callable[[], Any] -> Any` could be `TypeVar T`: `poll: Callable[[], T]`, `until: Optional[Callable[[T], bool]]`, `-> T`. That gives typed returns at `wsgi_app_test` and the cancel check. It's optional for test code.

### nit: redundant `timeout=5` (`test/messaging_outbox_test.py:106`)

It equals the default. The old code had it too.

### `wait_for_test.py`: keep it

- The two timeout tests (`:18-25`) earn their place. The timeout path is not exercised anywhere else in the suite except on real failures, and the message format is the helper's whole point. The `^...$` anchors are strict but reasonable for a message contract.
- `test_wait_for_returns_polled_value_once_until_holds` covers the return-value contract that `wsgi_app_test` and the cancel check depend on. That's fine.
- `test_wait_for_returns_first_truthy_value` is the closest to trivial, since 20 call sites exercise the truthy path. It does pin "returns the value, not True", though. It could be merged with the `until` test, but deleting it is not worth the churn.
- The tests are fast (about 0.1s total). The file name follows the `*_test.py` convention.

## House style

- Imports: top-level everywhere. `wsgi_app_test.py` also fixes the pre-existing in-function `from .test_utils import test_pulsar_app`, which is good. `time` was correctly dropped from `messaging_outbox_test`/`wsgi_app_test` and kept where it is still used.
- No obvious comments were added. The docstring is two sentences. The parenthetical "(a plain condition's last value is just falsy)" is a bit cryptic; "(without `until`, the last value is only ever falsy, so it is omitted)" is clearer.
- The commit message is clear, and "Fixes #527" is correct.

## Follow-up (2026-09-30, commit 375f302)

- 1: descriptions now name the awaited state ("the outbox to drain", "one publish call", ...).
- 2: cancel check timeout 2s; lambda param renamed `polled`.
- 3: not done. `integration_test_state.py` is never collected (#484), and running it by hand hangs locally, so edits there can't be verified. Left for #484.
- 4, 5, 6, 7, 8: done (`done` local, `until=` on the postprocessing index, TypeVar, dropped the redundant `timeout=5`, docstring reworded).
