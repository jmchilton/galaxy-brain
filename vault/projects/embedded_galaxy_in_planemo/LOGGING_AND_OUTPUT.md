# Logging and Output

> Historical deep dive. The canonical file-backed, Rich-safe logging decision is in [`PLAN.md`](PLAN.md).

What the user sees when Galaxy runs inside Planemo's process. See `TRANSPORT_AND_SERVER_MODEL.md` for the threaded-uvicorn decision and `PROCESS_LIFECYCLE.md` for shutdown.

## Context

Today Galaxy is a subprocess that writes to a log file, and Planemo reads that file when it has something to show. The mechanism is thinner than it looks: Planemo sets `GALAXY_LOG`, which `run.sh` turns into `GALAXY_DAEMON_LOG`, which Galaxy uses to append a `RotatingFileHandler` to its own root logger. Planemo then tails the file from a daemon thread and echoes it through `ctx.log`.

The framing that matters for embedding: **the problem is not that Galaxy's logs won't reach the terminal - it is that they already will.** Planemo's own logging configuration declares a `galaxy` logger at INFO (DEBUG under `-v`) with `propagate: False` and a console handler. That configuration exists today and does nothing, because there is no `galaxy.*` logger in Planemo's process. The moment Galaxy is imported and constructed in-process, it starts emitting through a handler Planemo installed years ago. The default outcome is a flood, not silence.

## Decisions

**1. Construct the app with `configure_logging=False`.**
`GalaxyManagerApplication.__init__` takes `configure_logging=True` and calls `config.configure_logging(...)` unconditionally on that default; `UniverseApplication` inherits it. That call runs `logging.config.dictConfig` with a config whose **root** is `handlers: ["console"], level: DEBUG` on `sys.stderr`. Verified empirically by replaying both configs in order: Planemo's root at WARNING becomes DEBUG, and Planemo's `galaxy` entry survives only because `disable_existing_loggers` is false and Galaxy's default never names `galaxy`.

The consequence is counterintuitive and worth stating plainly: **the `galaxy` logger is not the noise problem - everything else is.** `sqlalchemy`, `uvicorn`, `alembic`, `asyncio`, `urllib3`, and `bioblend` all reach the new root handler at DEBUG. Galaxy's own Celery worker already passes `configure_logging=False`, so this is a supported path rather than a hack.

**2. Planemo owns the entire logging configuration, through the chokepoint it already has.**
`configure_standard_planemo_logging` is the single `dictConfig` call in all of Planemo - there is no other `basicConfig`, `fileConfig`, `getLogger`, or `addHandler` anywhere in the package, and Planemo's own code logs exclusively through click. That makes it the natural and only place to add what Galaxy's default config would have provided: the third-party suppressions (`sqlalchemy`, `uvicorn`, `alembic`, `asyncio`, `urllib3`, `watchdog`, `celery`, `amqp`, `botocore`) that Galaxy carries in its own `loggers` block.

Set **logger** levels, not just handler levels. Galaxy's `default_log_config` only raises the console handler's level and leaves root at DEBUG, so every DEBUG record is still constructed and formatted before being discarded. Owning the config lets us not pay for that.

**3. Do not let Galaxy's `logging:` config key back in through the side door.**
It exists (`config_schema.yml`, `type: map, allowempty: true`) and is passed to `dictConfig` verbatim and unmerged. `dictConfig`'s own default for a missing `disable_existing_loggers` is **`True`**, so a hand-written block that omits the key would silently disable Planemo's own logger configuration. If a future option lets users supply one, it must be merged rather than passed through.

**4. Keep the capture-and-replay-on-failure contract; back it with an in-process handler.**
The contract already exists and is worth preserving exactly: `log_contents` for the whole log, `service_log_contents` for a per-service tail, and `log_service_logs_on_failure`, which returns early when every result succeeded and otherwise echoes tails through `ctx.log`. Downstream also already routes the full log somewhere non-terminal - `RunResponse.log` becomes `problem_log` in the HTML and JSON reports.

An embedded config subclass therefore needs to implement two properties over a buffer we own, and nothing else changes. Attaching our own handler is the direct analogue of what `GALAXY_DAEMON_LOG` does today. Note that Galaxy's version of this **mutates the module-level `LOGGING_CONFIG_DEFAULT` in place with `.append`**, so repeated construction in one process accumulates duplicate handlers - a further reason to install our own rather than reuse that path.

**5. The terminal is quiet by default; `-v` streams.**
Given decisions 1 and 2, the default should be that Galaxy's log goes to the buffer and the file, and the terminal shows Planemo's own output only - with the full log surfacing on failure through the existing replay path and in the report. `-v` opts into live streaming. This matches what users get today and avoids the collision in decision 6 for the common case.

**6. A `logging.StreamHandler` will corrupt the rich live display. This is the one hard technical constraint.**
`logging.StreamHandler` binds `sys.stderr` **at construction time** - verified: after swapping `sys.stderr`, the handler still holds the original object. Planemo's handler is constructed during CLI startup, long before any progress display exists.

Everything else Planemo writes is safe by accident: `click.echo`, bare `print`, and `ctx.log` all resolve `sys.stdout`/`sys.stderr` at *call* time, so while a `rich.live.Live` is active they hit rich's `FileProxy` (rich redirects stdout and stderr by default) and get rendered cleanly above the live region. The logging handler is the **only** writer that bypasses this.

So when `-v` streams Galaxy's logs, they must not go through a plain `StreamHandler`. They need a handler that writes through the live `Console`, or streaming must be suppressed while a display is active. Two aggravating details: `WorkflowProgressDisplay` and `UploadProgressDisplay` use **different `Console` objects** (one implicit global, one its own), so rich's per-console interlock cannot see across them; and Galaxy emits from many threads at once, where `logging` locks its handler but not rich's render.

**7. Drop the log-tailing thread for this engine.**
`read_log` polls a file once per second and echoes through `ctx.log`. In-process it would tail a file whose writer is in the same process - redundant, and a second thread writing to the terminal during a live display. The `threading.Event` plus bounded-join shutdown pattern is still a good model for anything that replaces it.

## Implementation

1. Extend `configure_standard_planemo_logging` with the third-party logger suppressions and a level knob, keeping it the single configuration point.
2. Construct the Galaxy app with `configure_logging=False`, and set `auto_configure_logging: false` in the generated config as a belt-and-braces second gate.
3. Install a buffering handler on the `galaxy` logger (and root, scoped to the engine's lifetime) that backs `log_contents` and `service_log_contents` for an embedded config subclass.
4. For `-v`, add a rich-aware handler that prints through whichever `Console` is live, or gate streaming on no display being active.
5. Remove the `daemon`-gated `read_log` thread from the embedded path.

## Verification

- With no flags, a passing `planemo test` under the embedded engine produces terminal output that matches the managed engine's, modulo the engine name. This is the real acceptance test and it is easy to diff.
- A failing test surfaces the Galaxy log tail through the existing `log_service_logs_on_failure` path.
- Under `-v`, a workflow run with an active `WorkflowProgressDisplay` renders without corruption. Hard to assert automatically; capturing output with a non-tty and asserting no ANSI cursor sequences interleave is a reasonable proxy, with a manual check for the real thing.
- A regression guard that Galaxy's `dictConfig` never runs: assert the root logger's level is unchanged after app construction.

## Adjacent findings, not acted on here

- **There is no `--quiet`,** and `-v` is heavily overloaded - it changes log levels, Galaxy's configured `log_level`, tool-test verbosity, history summaries, and several diagnostic dumps. A real log-level option would be a better fit than extending `-v` further, but that is a broader CLI change.
- **`UploadProgressDisplay` is gated on `sys.stdout.isatty()` while `WorkflowProgressDisplay` is not** - an existing inconsistency that matters more once another thread is writing.

## Open Questions

- Buffer the whole log in memory, or keep writing a file and tail it on failure? A long workflow's DEBUG log is large; the file keeps `--no_cleanup` useful for post-mortems.
- Should `service_log_contents` return a single `galaxy` entry embedded, or synthesize per-service keys to keep report output shaped the same?
- ~~If Celery runs in-process, does its output belong in the same buffer or a separate key?~~ Answered: the same buffer. Celery runs in-process (`BACKGROUND_WORK.md` decision 1), so the worker logs through the same root handler - but only if `worker_hijack_root_logger: false` is set, because booting a worker otherwise executes `root.handlers = []` and discards the handler installed here.
- Is quiet-by-default right, or should embedded mode stream at WARNING so a wedged startup is visible? A silent hang during tool loading would be worse than some noise.
