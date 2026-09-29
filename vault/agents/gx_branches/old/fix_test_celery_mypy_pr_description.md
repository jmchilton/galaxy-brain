Fixes the two mypy errors that turned `dev`'s Python linting red at `d7d1a403f09`:

```
test/unit/app/test_celery.py:127: error: "GalaxyTaskFunction" has no attribute "run"  [attr-defined]
test/unit/app/test_celery.py:141: error: "GalaxyTaskFunction" has no attribute "run"  [attr-defined]
```

The IWC refresh tests from #23669 call `tasks.refresh_iwc_manifest.run.__wrapped__`, and the `GalaxyTaskFunction` protocol from the typed `galaxy_task` decorator doesn't declare `run`.

- Declare `run: Callable[..., Any]` on `GalaxyTaskFunction`. Every Celery task has it.
- In the tests, use `inspect.unwrap(...run)` instead of `.run.__wrapped__`. `Callable` has no `__wrapped__` attribute, and `unwrap` is the typed way to get the undecorated body.

`cd lib && mypy . ../test` (the `make mypy` target CI runs) no longer reports `test_celery.py`, and `test/unit/app/test_celery.py` passes (12 tests).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
