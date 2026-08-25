# Review: Galaxy PR #23360

Reviewed 2026-08-24 at head `cb42d82bd8a7bf41e67783567a81d9a181b9c8af`.

PR: [galaxyproject/galaxy#23360 — “Fixes for package installed Galaxy”](https://github.com/galaxyproject/galaxy/pull/23360)

## What it now settles

The draft combines seven commits against `release_26.1` and provides most of the Galaxy-side prerequisite for Planemo:

- `build_galaxy_web_app()` constructs and returns the Galaxy, WSGI, and ASGI application objects from programmatic configuration and lets the caller disable the `atexit` registration.
- The uvicorn and test-driver paths use that shared builder.
- Wheel-installed jobs no longer receive a bogus CWD-relative `GALAXY_LIB`; source mode retains its checkout `lib` path.
- A non-activated virtual environment is recovered from `sys.prefix`, so the job script can activate the environment that supplied Galaxy.
- Remote tool evaluation gains a `galaxy-remote-tool-eval` entry point and chooses source/package form locally or on the Pulsar side.
- The AMQP schema documentation now matches runtime behavior: an explicitly configured Galaxy database is reused; otherwise the fallback is `<data_dir>/control.sqlite`. The former schema default was dead documentation, not a live CWD-relative default.
- `launch_server` now accepts a built app bundle rather than depending on a mutation of the caller's configuration dictionary.

These changes retire the old Planemo-side proposals to synthesize a checkout, force `GALAXY_LIB`, or categorically disable remote evaluation under wheels.

## Remaining upstream work

### 1. Fix the current mypy failure

The first completed failing check is `tox -e mypy`. Both assignments of `None` to `MockJobWrapper.galaxy_lib_dir` in `test/unit/app/jobs/test_command_factory.py` conflict with the mock's inferred `str` type. Declare the mock attribute as `Optional[str]`/`str | None`. This is being handled separately.

This failure is specific and reproducible; it is not an authentication or transient-network problem.

### 2. Clean the global on partial construction failure

`build_galaxy_web_app()` correctly calls `galaxy_app.shutdown()` if WSGI or ASGI assembly fails. However, `app_pair(..., app=galaxy_app)` first writes that instance to the module global `galaxy.app.app`. The exception path leaves the global pointing at a shut-down partial application.

Clear the global in the exception path when it still points at the failed instance. This matters to embedding callers because Celery's `get_galaxy_app()` prefers that global. It is a small correctness hardening, not a request to restore #23350's mocked test suite.

Concretely, the exception path should perform the equivalent of:

```python
if galaxy.app.app is galaxy_app:
    galaxy.app.app = None
with suppress(Exception):
    galaxy_app.shutdown()
raise
```

The identity check is important: it avoids clearing a different application that another owner may have installed.

## Test strategy decision

Do not restore #23350's heavily mocked checkout-free package smoke test. Its mocks did not provide useful confidence in real wheel-installed execution. The meaningful proof belongs in Planemo: build/install the released extra, start the embedded engine outside a Galaxy checkout, and run real XML/YAML tool, upload, metadata, and workflow integrations over HTTP.

## Planemo-specific follow-up, not a #23360 merge blocker

Galaxy's Celery application still resolves and caches its configuration at import time from `GALAXY_CONFIG_FILE`/`GALAXY_ROOT_DIR`. Importing the ASGI service graph imports `galaxy.celery`, so a caller that needs a worker cannot rely only on the new builder's programmatic dictionary.

Planemo can safely work around this by writing its existing `galaxy.yml`, setting `GALAXY_CONFIG_FILE` before the first lazy Galaxy import, and setting/clearing `galaxy.app.app` around the lifecycle. A later Galaxy API should accept an already-built application/configuration and return a supported in-process worker context, avoiding `celery.contrib.testing.worker` and environment ordering as public embedding contracts.

## Release gate

Do not publish a Planemo extra with `galaxy>=26.1,<26.2`: 26.1.0 and 26.1.1 predate this work and satisfy that range. Once #23360 is released, use the first containing patch release as the floor, for example `>=26.1.2,<26.2` only if 26.1.2 is in fact that release.

At review time the PR is an open draft with no review discussion. CI is still running; the known completed failure is the two-line mypy issue above.
