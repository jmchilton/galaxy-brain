---
type: research
subtype: component
tags: [research/component, galaxy/lib, galaxy/testing, galaxy/admin]
status: draft
created: 2026-03-03
revised: 2026-03-03
revision: 1
ai_generated: true
component: backend-logging
branch: cwl_fixes_4
---

# Galaxy Backend Logging Architecture

## Overview

Galaxy logging is built on Python's standard `logging` module with several Galaxy-specific layers:
- A `dictConfig`-based default config (`LOGGING_CONFIG_DEFAULT`)
- Application stack-aware formatters/filters
- A custom `TRACE` log level (5)
- Optional Fluentd and Sentry integrations
- Special configuration for test servers

---

## 1. Core Default Config: `LOGGING_CONFIG_DEFAULT`

**File:** `lib/galaxy/config/__init__.py:74-148`

A Python dict passed to `logging.config.dictConfig()`. Key structure:

```python
LOGGING_CONFIG_DEFAULT = {
    "disable_existing_loggers": False,
    "version": 1,
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",             # root logger is DEBUG by default
    },
    "loggers": { ... },               # per-library suppressions
    "filters": {
        "stack": {
            "()": "galaxy.web_stack.application_stack_log_filter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "stack",
            "level": "DEBUG",
            "stream": "ext://sys.stderr",   # default: stderr
            "filters": ["stack"],
        },
    },
    "formatters": {
        "stack": {
            "()": "galaxy.web_stack.application_stack_log_formatter",
        },
    },
}
```

### Suppressed loggers (raised above DEBUG)

| Logger | Level |
|--------|-------|
| `paste.httpserver.ThreadPool` | WARN |
| `sqlalchemy_json.track` | WARN |
| `urllib3.connectionpool` | WARN |
| `routes.middleware` | WARN |
| `amqp` | INFO |
| `botocore` | INFO |
| `gunicorn.access` | INFO (propagate=False, own handler) |
| `watchdog.observers.inotify_buffer` | INFO |
| `py.warnings` | ERROR |
| `celery.utils.functional` | INFO |
| `sentry_sdk.errors` | INFO |

---

## 2. Custom Log Level: TRACE

**File:** `lib/galaxy/util/custom_logging/__init__.py`

```python
LOGLV_TRACE = 5
logging.addLevelName(LOGLV_TRACE, "TRACE")
logging.setLoggerClass(GalaxyLogger)
```

`GalaxyLogger` adds a `.trace()` method. This is registered at module import time AND again in `configure_logging()`.

---

## 3. Application Stack Log Format & Filter

**File:** `lib/galaxy/web_stack/__init__.py:24-33`

```python
class ApplicationStackLogFilter(logging.Filter):
    def filter(self, record):
        return True  # no-op pass-through

class ApplicationStack:
    log_filter_class = ApplicationStackLogFilter
    log_format = "%(name)s %(levelname)s %(asctime)s [pN:%(processName)s,p:%(process)d,tN:%(threadName)s] %(message)s"
```

The `stack` formatter and filter in `LOGGING_CONFIG_DEFAULT` are resolved at dictConfig time via the `()` factory key:
- `"galaxy.web_stack.application_stack_log_filter"` -> returns `ApplicationStackLogFilter()`
- `"galaxy.web_stack.application_stack_log_formatter"` -> returns `logging.Formatter(fmt=<log_format>)`

**Concrete subclasses:**
- `WebApplicationStack` (name="Web")
- `GunicornApplicationStack` (name="Gunicorn") - adds worker ID to server_name
- `WeblessApplicationStack` (name="Webless") - for job handlers

All use the same log format and filter.

### Default log line appearance

```
galaxy.jobs DEBUG 2024-01-15 10:30:45,123 [pN:MainProcess,p:12345,tN:MainThread] Some message
```

---

## 4. `configure_logging()` — The Main Entry Point

**File:** `lib/galaxy/config/__init__.py:165-201`

Called from `GalaxyManagerApplication.__init__()` (`lib/galaxy/app.py:599-600`):
```python
if configure_logging:
    config.configure_logging(self.config, self.application_stack.facts)
```

Logic:
1. Check if PasteScript already configured logging (legacy `.ini` configs)
2. Check `auto_configure_logging` (default: True)
3. If no `logging:` key in galaxy.yml, use `LOGGING_CONFIG_DEFAULT`
4. Honor `log_level` setting (adjusts console handler level)
5. Template `filename_template` in FileHandler configs using `facts` dict
6. Call `logging.config.dictConfig(logging_conf)`

---

## 5. `GalaxyAppConfiguration.__init__` Modifications to `LOGGING_CONFIG_DEFAULT`

**File:** `lib/galaxy/config/__init__.py:1255-1286`

The `Configuration.__init__` method **mutates the global** `LOGGING_CONFIG_DEFAULT` dict before `configure_logging()` runs:

### `log_destination` handling
- `"stdout"` → replaces console handler stream with `ext://sys.stdout`
- Other string → replaces console handler with `RotatingFileHandler` pointing to that path
- Default (unset) → keeps `ext://sys.stderr`

### `GALAXY_DAEMON_LOG` env var
If set, adds a second `"files"` handler (RotatingFileHandler) to the root logger.

### `log_rotate_size` / `log_rotate_count`
Applied to both `log_destination` file handler and `GALAXY_DAEMON_LOG` handler.

### GDPR compliance mode
When `enable_celery_tasks` and compliance mode is active, adds:
- `"brief"` formatter: `%(asctime)s %(levelname)-8s %(name)-15s %(message)s`
- `"compliance_log"` handler: RotatingFileHandler -> `compliance.log`
- `"COMPLIANCE"` logger

---

## 6. User-Configurable Settings (galaxy.yml)

From `lib/galaxy/config/schemas/config_schema.yml`:

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_configure_logging` | `true` | Enable Galaxy's auto-logging setup |
| `log_destination` | `stdout` | `"stdout"`, or a file path |
| `log_level` | `DEBUG` | Root log level (DEBUG, INFO, WARNING, ERROR, CRITICAL, TRACE) |
| `log_rotate_size` | `0` | Rotate at this size (bytes or "100 MB") |
| `log_rotate_count` | `0` | Number of rotated backups |
| `logging` | `null` | Full dictConfig override (overrides all `log_*` settings) |
| `database_engine_option_echo` | `false` | Log all SQLAlchemy SQL |
| `database_query_profiling_proxy` | `false` | Log via `galaxy.model.orm.logging_connection_proxy` |
| `slow_query_log_threshold` | `0.0` | Log queries slower than this (seconds) |

### Custom `logging:` dictConfig in galaxy.yml

When set, this dict is passed directly to `logging.config.dictConfig()`, fully replacing the default. Supports `filename_template` on FileHandler handlers, with `{server_name}`, `{hostname}`, `{fqdn}`, etc. from `Facts`.

---

## 7. Sentry Integration

**File:** `lib/galaxy/app.py:211-258`

Configured via:
- `sentry_dsn` - connection string
- `sentry_event_level` - minimum level sent as events (default: ERROR)
- `sentry_traces_sample_rate` - performance tracing (default: 0.0)
- `sentry_ca_certs` - custom CA cert path

Uses `sentry_sdk` with `LoggingIntegration`:
- Breadcrumbs captured at INFO+
- Events sent at configured level

Called from `GalaxyUniverseApplication.__init__` after datatypes registry init.

---

## 8. Fluentd Integration

**File:** `lib/galaxy/app.py:313-321`, `lib/galaxy/util/custom_logging/fluent_log.py`

Configured via:
- `fluent_log` (bool, default: false)
- `fluent_host` (default: localhost)
- `fluent_port` (default: 24224)

Creates a `FluentTraceLogger` (not a standard logging handler - a separate event system). Stored as `app.trace_logger` and used for application-level event logging (tool runs, etc.), not general log messages.

---

## 9. Test Server Logging

### `test_logging.py` — Early Bootstrap

**File:** `lib/galaxy_test/driver/test_logging.py`

Imported at module load time by `driver_util.py`. Checks `GALAXY_TEST_LOGGING_CONFIG` env var:
- If set: loads that file via `logging.config.fileConfig()` and sets `logging_config_file` to the path
- If unset: `logging_config_file = None`

### `setup_galaxy_config()` — Test Config Assembly

**File:** `lib/galaxy_test/driver/driver_util.py:112-295`

Key logging-related config values set for test servers:

```python
config = dict(
    auto_configure_logging=logging_config_file is None,  # True unless GALAXY_TEST_LOGGING_CONFIG set
    log_destination="stdout",                             # Always stdout for tests
    logging=LOGGING_CONFIG_DEFAULT,                       # Passes the default dict explicitly
    ...
)
```

So for tests:
- `log_destination="stdout"` causes `Configuration.__init__` to rewrite the console handler to use `sys.stdout` instead of `sys.stderr`
- `logging=LOGGING_CONFIG_DEFAULT` is passed explicitly, but `configure_logging()` would also fall back to it
- `auto_configure_logging` is True unless a custom logging config file is provided

### Uvicorn Access Log

**File:** `lib/galaxy_test/driver/driver_util.py:522`

```python
access_log = False if "GALAXY_TEST_DISABLE_ACCESS_LOG" in os.environ else True
```

Uvicorn's HTTP access log is enabled by default for test servers, disabled via `GALAXY_TEST_DISABLE_ACCESS_LOG`.

---

## 10. Gravity (Production) Logging

**File:** `lib/galaxy_test/driver/driver_util.py:704-738` (test usage)

When Galaxy runs under Gravity (the process manager), logging goes to files under `<state_dir>/log/`:
- `gunicorn.log`
- `celery.log`
- `gx-it-proxy.log`

Gravity's `log_dir` is configurable in galaxy.yml under the `gravity:` section.

---

## 11. Key Environment Variables

| Variable | Effect |
|----------|--------|
| `GALAXY_TEST_LOGGING_CONFIG` | Path to a logging config file for test servers |
| `GALAXY_TEST_DISABLE_ACCESS_LOG` | Disable uvicorn access logging in tests |
| `GALAXY_TEST_LOG_FORMAT` | Custom log format for test driver (read but not directly applied to dictConfig) |
| `GALAXY_DAEMON_LOG` | Additional file handler destination |

---

## 12. Flow Summary

### Production (gunicorn via Gravity)
1. Gravity starts gunicorn workers
2. `GalaxyAppConfiguration.__init__` mutates `LOGGING_CONFIG_DEFAULT` based on `log_destination`, rotation settings, etc.
3. `GalaxyManagerApplication.__init__` calls `configure_logging(config, facts)`
4. `configure_logging()` calls `logging.config.dictConfig()` with the (possibly mutated) config
5. `configure_sentry_client()` adds Sentry integration if configured

### Test server (embedded uvicorn)
1. `test_logging.py` imported → optionally loads external logging config
2. `setup_galaxy_config()` assembles config dict with `log_destination="stdout"` and `logging=LOGGING_CONFIG_DEFAULT`
3. `build_galaxy_app()` → `GalaxyUniverseApplication(**kwargs)` → same `configure_logging()` path
4. Test output appears on stdout with format:
   ```
   galaxy.jobs DEBUG 2024-01-15 10:30:45,123 [pN:MainProcess,p:12345,tN:MainThread] message
   ```

### Important note on `LOGGING_CONFIG_DEFAULT` mutation
The default config dict is a **module-level global** that gets mutated in-place by `Configuration.__init__`. This means it's not truly "default" after first use — it carries modifications from the Configuration constructor (log_destination changes, compliance additions, etc.).
