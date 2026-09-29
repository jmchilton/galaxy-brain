# galaxy#23798 - [26.1] End SSE streams when a gunicorn worker starts draining

- PR: https://github.com/galaxyproject/galaxy/pull/23798 (mvdbeek, `sse-end-streams-on-drain` -> `release_26.1`)
- Reviewed head: `ed06c81d092`
- Worktree: `~/projects/worktrees/galaxy/pr/23798/` (ghwt not used: https fetch + `git worktree add`)
- Stacked on #23626 (still open), which contributes commit `a3b61edcfb7`. Review scope: the two new commits, `cffda969ea3` and `ed06c81d092` (`git diff a3b61edcfb7 ed06c81d092`, 5 files, +197/-6).
- CI: 56 pass, 1 skipping, 1 pending (labels bot). No existing reviews or comments.
- Verdict: **approve**. Two optional low-severity suggestions below.

## Change summary

- `SSEConnectionManager.begin_shutdown()` sets `_shutting_down` and puts a `_SHUTDOWN_WAKEUP` sentinel into every connection queue. `stream()` returns at once if the flag is set, checks it at the top of each loop, and breaks when it reads the sentinel.
- `workers.on_drain_start(cb)` adds `cb` to a module-level list and returns an unregister callable. `_Server.shutdown()` runs the callbacks synchronously (logging and swallowing exceptions) before `super().shutdown()`.
- `initialize_fast_app` registers `app[SSEConnectionManager].begin_shutdown` and adds the unregister function to `gx_app.haltables`.

## Correctness check (verified)

- **Ordering claim holds.** uvicorn `Server.shutdown()` closes the servers and sockets and calls `connection.shutdown()` on every connection with no await in between. The first await is `asyncio.sleep(0.1)`. The callbacks run synchronously before that, and `ensure_future(report_drain)` only schedules, so no stream task can wake up while keep-alive is still on. The woken stream finishes its response, and the connection then closes instead of going idle. Checked against the uvicorn 0.52.1 source; the pin is 0.47.0, and the PR's manual test was run on 0.47.
- **Both drain paths are covered.** SIGTERM (`should_exit`) and `--max-requests` (`on_tick` returning true) both leave `main_loop` and go through `_Server.shutdown()`, so hooking there is right. Hooking lifespan shutdown would be too late, because it runs after the drain.
- **No race in the event loop.** `begin_shutdown` runs on the loop, and every queue put from another thread goes through `call_soon_threadsafe`. A stream blocked in `get()` on an empty queue gets the sentinel. A stream with a non-empty queue gets a real event, yields it, then sees the flag. The full-queue branch is handled.
- **Reconnect behaviour is right.** A stream opened after shutdown gets a 200 with an empty body, and `EventSource` retries after that. A 503 would have made the browser stop retrying. The client's `useNotificationSSE.ts` also takes over reconnecting with jittered backoff once `readyState === CLOSED`. The listener socket belongs to the arbiter, so reconnects queue on the shared backlog even with `--workers 1`.
- Plain uvicorn and test drivers never call the hook, so behaviour there is unchanged. That is fine and outside this PR's scope.

## Findings

### 1. Low: events already queued are dropped when the drain starts
`lib/galaxy/managers/sse.py:356` (`while not self._shutting_down:`)

The loop checks the flag before it empties the queue. Anything already buffered is thrown away: in the full-queue case that is up to 63 events, and in a burst it is every event after the one being yielded. Last-Event-ID catch-up rebuilds only `notification_status` (`services/notifications.py:build_status_catchup`). Buffered `history_update` and `broadcast_update` events are not recovered. Reproduced: push 3 events to user 1, call `begin_shutdown()`, and the stream then yields `[]`.

Events pushed while the client is reconnecting are lost anyway, so this only narrows a gap that already exists. Still, it is cheap to flush what is already buffered:

```python
try:
    while not (self._shutting_down and queue.empty()):
        if await is_disconnected():
            break
        try:
            event = await asyncio.wait_for(queue.get(), timeout=keepalive)
            if event is _SHUTDOWN_WAKEUP:
                continue
            yield event.to_wire()
        except asyncio.TimeoutError:
            yield ": keepalive\n\n"
```

The drain stays bounded by the queue size and by `graceful_timeout`. `test_begin_shutdown_ends_a_stream_whose_queue_is_full` would then assert that the buffered events are delivered and the stream then ends. That is a change of intended behaviour, not a weakened test. The other option is to keep the current behaviour and state in the `begin_shutdown` docstring that buffered events are dropped.

### 2. Low: `fast_app` now imports the gunicorn worker module
`lib/galaxy/webapps/galaxy/fast_app.py:41`, `lib/galaxy/webapps/galaxy/workers.py:56-76`

The callback registry has no gunicorn- or uvicorn-specific code, but it lives in `workers.py`, which imports `gunicorn.arbiter` and `uvicorn.workers` at module level. Every `initialize_fast_app` call now pulls those in, including plain-uvicorn runs, test drivers and every API test app. On recent uvicorn that also means the `uvicorn.workers` DeprecationWarning, and the "uvloop not available" warning wherever uvloop is missing.

Suggestion: move `on_drain_start` and `_run_drain_start_callbacks` into `galaxy.web_stack`, next to the similar class-level `ApplicationStack.register_postfork_function` registry, which is also where `gunicorn_config` lives. Then `workers.py` imports the runner from there. The web app then depends on a lifecycle hook in the stack layer rather than on one worker implementation, and any other server integration (a future non-gunicorn worker, or `uvicorn-worker` when uvicorn drops `uvicorn.workers`) can call the same runner. For a 26.1 backport this is optional. It could also be done on dev after the merge.

### Not raised (considered, dropped)
- The unregister lambda raises `ValueError` if called twice. `haltables` runs once per app, so this is not worth raising.
- Burst of reconnects: a worker holding about 169 streams (the Sentry event) now has every client reconnect about 3s after the drain starts instead of after 30s. The load is the same, only earlier, and each reconnect is a single catch-up query.

## Tests

- `test_sse_stream.py`: all three tests are meaningful: blocked on an empty queue, full queue, and stream opened after shutdown. None is trivial.
- `test_gunicorn_worker.py`: `open_stream_through_a_recycle` starts a real `_Server` on a socket with `limit_max_requests=1` and drives the max-requests path end to end. This is effectively an integration test and the right level for the ordering claim. The failing-callback variant reuses it cleanly.
- The PR description says each test fails when the part of the fix it covers is removed. That is a red-to-green check.
- Gap (minor): nothing covers the `initialize_fast_app` wiring. A full API or integration test for this is not worth it, and the hook is one line.
- Ran locally with the main clone's venv (uvicorn 0.52.1, gunicorn 26.0.0, starlette 1.4.1) against the worktree's `lib`: `test_sse_stream.py` and `test_gunicorn_worker.py` gave **18 passed**.
- Imports are at module top level in all touched files. There are no obvious comments. The `fast_app` comment and the `_Server.shutdown` comment both explain something that is not obvious from the code.

## Draft GitHub review (not posted)

> *Posted by Claude (AI assistant) on behalf of jmchilton. This is not written by jmchilton personally.*
>
> Looks good. I checked the ordering argument against uvicorn's `Server.shutdown()`: the listeners close and `connection.shutdown()` runs before the first await, so running the callbacks synchronously just before it is sound. `_Server.shutdown()` also covers both the SIGTERM path and the `--max-requests` path. Returning an empty 200 to streams opened after the drain starts is right, since a 5xx would make `EventSource` stop retrying. The real-`_Server` test is a nice way to pin this down.
>
> Two optional suggestions:
>
> 1. **Buffered events are dropped on drain.** `while not self._shutting_down:` breaks before the queue is emptied. Anything already buffered (up to 63 events in the full-queue case) is lost, and Last-Event-ID catch-up rebuilds only `notification_status`, not `history_update` or `broadcast_update`. The reconnect gap loses events anyway, but flushing what is already buffered is cheap:
>    ```python
>    while not (self._shutting_down and queue.empty()):
>        if await is_disconnected():
>            break
>        try:
>            event = await asyncio.wait_for(queue.get(), timeout=keepalive)
>            if event is _SHUTDOWN_WAKEUP:
>                continue
>            yield event.to_wire()
>        except asyncio.TimeoutError:
>            yield ": keepalive\n\n"
>    ```
>    The full-queue test would then check that the buffered events arrive before the stream ends. If dropping them is intended, a line in the `begin_shutdown` docstring saying so would help.
>
> 2. **Where the registry lives.** `fast_app` now imports `galaxy.webapps.galaxy.workers`, which brings `gunicorn.arbiter` and the deprecated `uvicorn.workers` into every app build, including plain uvicorn and the test drivers. `on_drain_start` and `_run_drain_start_callbacks` don't depend on gunicorn. Would they fit in `galaxy.web_stack`, next to `ApplicationStack.register_postfork_function`, with `workers.py` importing the runner from there? That keeps the web app off the worker implementation and gives any future server integration the same hook. This is fine as a follow-up on dev if you'd rather keep the backport small.
