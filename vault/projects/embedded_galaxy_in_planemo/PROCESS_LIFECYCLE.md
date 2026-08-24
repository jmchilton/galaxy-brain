# Process Lifecycle

Startup ordering, shutdown, signals, and cleanup for the `embedded_galaxy` engine. See `TRANSPORT_AND_SERVER_MODEL.md` for the decision to run uvicorn on a background thread, which is what makes most of this hard.

## Context

Every existing engine ends Galaxy from the outside: the local engine tries `galaxyctl shutdown` and falls back to `os.killpg` on the pid file, the Docker engine runs `docker kill`, the external engine does nothing. In-process there is no outside. Planemo becomes responsible for a shutdown sequence it has never had to own, and today it owns none of the machinery: `atexit`, `signal.signal`, `import signal`, and `KeyboardInterrupt` each appear **zero** times across `planemo/`.

That absence works today. `KeyboardInterrupt` is a `BaseException`, so it survives the bare `except Exception` in the test loop, unwinds through `serve_daemon`'s `finally`, and `kill()` plus `cleanup()` run. Ctrl-C correctly stops Galaxy and removes the temp directory. Preserving that property in-process is the whole job.

## Decisions

**1. Planemo installs a SIGINT handler for the first time, because nothing else will.**
uvicorn does not install signal handlers when `serve()` runs off the main thread - it detects the condition and skips deliberately:

```python
def capture_signals(self):
    # Signals can only be listened to from the main thread.
    if threading.current_thread() is not threading.main_thread():
        yield
        return
```

It does not raise, does not fall back to `loop.add_signal_handler`, and the captured-signal replay after the `yield` is unreachable. `handle_exit` therefore never fires, which means **`should_exit` and `force_exit` are only ever settable programmatically**. Galaxy installs nothing either: its one app-construction site builds an empty handler dict unless `use_heartbeat` is on, and that defaults to false. So the interrupt lands on CPython's default handler in the main thread and nobody tells the server to stop.

**2. Escalate on the second interrupt, since uvicorn's own escalation is dead code here.**
uvicorn's `handle_exit` sets `should_exit` on the first signal and `force_exit` on a second SIGINT. Off the main thread that logic never runs, so Planemo reimplements it: first interrupt requests graceful shutdown, second sets `server.force_exit = True` and stops waiting. Without this, a user who interrupts during a wedged shutdown has no escape.

**3. Bound every wait. Three separate layers are unbounded by default.**
This is the most likely way the embedded engine hangs, and each layer needs an explicit fix:

- `Server.shutdown` does `asyncio.wait_for(self._wait_tasks_to_complete(), timeout=self.config.timeout_graceful_shutdown)`, and `timeout_graceful_shutdown` defaults to `None` - so the `except asyncio.TimeoutError` branch that would cancel tasks never fires. `_wait_tasks_to_complete` then spins `while connections and not force_exit`, and `force_exit` is unreachable per decision 1. Pass an explicit timeout into `uvicorn.Config`.
- The `thread.join()` in Galaxy's `EmbeddedServerWrapper.stop()` has no timeout. Ours gets one.
- The WSGI threadpool haltable that `initialize_fast_app` appends is `executor.shutdown` with its default `wait=True`, also unbounded.

**4. Treat a hung shutdown as a visible failure, not a wedged terminal.**
The uvicorn thread is **not** a daemon (`driver_util.py:554` constructs it with no `daemon=True`), and a2wsgi's WSGI `ThreadPoolExecutor` workers are non-daemon with their own `concurrent.futures` atexit join. So after click prints `Aborted!` and calls `sys.exit(1)`, interpreter shutdown blocks on those threads with no traceback and no message. Marking our server thread `daemon=True` is a useful backstop but is **not sufficient on its own** - it does nothing about the a2wsgi executor. The requirement is that shutdown either completes or reports why it didn't, within a bounded time.

**5. Do not let Galaxy register its `atexit` hook.**
`buildapp` registers `app.shutdown` via `atexit` unless `register_shutdown_at_exit=False`. Galaxy's own test driver disables it and calls `shutdown()` explicitly; we do the same. Two reasons: ordering against Python's `concurrent.futures` atexit join is nondeterministic, and `shutdown()` is not idempotent (decision 6), so a hook plus an explicit call means running it twice.

**6. Guard `app.shutdown()` with a once-flag, and treat its exception as non-fatal.**
There is no `_is_shutdown` or equivalent anywhere in `lib/galaxy` - `HaltableContainer.shutdown` neither sets a flag nor clears `self.haltables`, so a second call re-runs all twelve haltables. It also **collects the first exception and re-raises it after draining**, which means a nominally clean teardown can raise: with no AMQP configured `self.queue_worker` is `None`, so the first haltable raises `AttributeError`, gets logged, and is re-raised at the end. Planemo must not let that mask the real error the user cares about.

**7. Build the Galaxy app directly; never route construction through `buildapp.app_pair`.**
Its construction path catches any exception and does `traceback.print_exc(); sys.exit(1)` - a hard process exit from library code, which would bypass Planemo's cleanup entirely. Construct the application object ourselves so a construction failure is an ordinary exception.

**8. Handle the construct-failed case explicitly, because the current code does not.**
If Galaxy raises before a server exists, `serve_daemon`'s `config` is still `None`, its `if config:` is false, and neither `kill()` nor `cleanup()` runs. The temp directory is also retained, because `_serve` sets `no_cleanup = True` whenever `daemon` is truthy and `serve_daemon` forces `daemon = True`. That mutation is invisible to `serve_daemon`'s own `kwds` (each `**kwds` hop makes a fresh dict), so deletion happens only via `config.cleanup()` gated on the user's `--no_cleanup`. Net: a construction failure leaks a `mkdtemp` directory today. The embedded engine should clean up what it created regardless of how far startup got, still honoring `--no_cleanup`.

**9. Running jobs are killed, not awaited - and that is safe here.**
Job shutdown does not wait for jobs, only for *threads*: `BaseJobRunner.shutdown` joins workers in 2 s slices up to `monitor_thread_join_timeout` (default 30 s, which Galaxy's driver lowers to 5), then dumps stacks and returns anyway. `LocalJobRunner.shutdown` then calls `kill_pg(proc.pid)` on each child. **There is no risk of Planemo killing itself**: children are spawned with `preexec_fn=os.setpgrp` specifically so each job is the root of its own process group rather than Galaxy's. Worth lowering `monitor_thread_join_timeout` as the driver does, since `super().shutdown()` burns that timeout *before* the children are killed, and a worker blocked in `proc.wait()` cannot exit until they are.

**10. Repeat launches are real, not hypothetical - and v1 should avoid them rather than solve them.**
Two paths launch Galaxy twice in one process, both sequential, never concurrent: `planemo autoupdate --test` opens an `engine_context` for the workflow update and then calls `test_runnables`, which opens a second; and `planemo test` with a mix of file-based and `gxid://tools/` runnables splits the test cases and serves once for each group. The right v1 move is to restructure those to a single launch or exclude them from the embedded engine, not to make repeat launches work - because the blockers are module-level globals with no reset path (`galaxy.app.app`, `Security.security`, `Dataset.object_store`, `Dataset.file_path`, `model._datatypes_registry`, celery's `lru_cache`d config accessors), and Galaxy's own `caching_fast_app_factory` addresses **none** of them. That machinery solves FastAPI object reuse for pytest's hundreds of launches per process; it is not a repeat-launch safety net.

## Implementation

1. A shutdown routine that runs in a fixed order with a deadline: set `should_exit`, join the server thread with a timeout, then `app.shutdown()` behind a once-flag, then remove the temp directory. Every step logs on timeout rather than blocking.
2. A `KeyboardInterrupt` handler scoped to the engine's context manager - not a global `signal.signal` - that sets `should_exit` on first interrupt and `force_exit` on second. Restore any previous handler on exit.
3. Pass `timeout_graceful_shutdown` explicitly when constructing `uvicorn.Config`.
4. Set `register_shutdown_at_exit=False` and `monitor_thread_join_timeout` low in the generated config.
5. Wrap startup so a failure at any stage still runs the cleanup appropriate to how far it got, honoring `--no_cleanup`.

## Verification

The scenarios worth having tests for, each currently unhandled:

- Ctrl-C during a hanging tool test terminates within the deadline and removes the temp directory. Red first: without a handler the process wedges after `Aborted!`.
- A second Ctrl-C during shutdown forces exit rather than waiting.
- A Galaxy construction failure leaves no temp directory behind and surfaces the original exception, not a `SystemExit`.
- `app.shutdown()` called twice does not raise out of the engine.
- A deliberately stuck request does not prevent the process from exiting within the deadline.

The interrupt tests are awkward to automate in-process; a subprocess harness that sends real signals to `planemo test` and asserts on exit code, timing, and the absence of the temp directory is more honest than simulating them.

## Open Questions

- Server thread `daemon=True` as a backstop, accepting that Galaxy cleanup is then skipped on a wedge - or non-daemon with a hard deadline and an explicit error?
- What deadline is right for graceful shutdown? Galaxy's driver uses 5 s for thread joins; jobs may want longer.
- Should the embedded engine refuse the two multi-launch paths outright, or fall back to the managed engine for them?
- Is a scoped `signal.signal` acceptable inside a library-ish code path, given Planemo is always the top-level process here?
