Initialize job error reporting for Celery manager applications

---

Celery's `finish_job()` creates a `MinimalJobWrapper` with a manager-only Galaxy application. Failed jobs can reach `_report_error()`, but `error_reports` was initialized only by `UniverseApplication`, and reporting unconditionally accessed a toolbox that manager applications intentionally do not have.

This change:

- Initializes error-report plugins and the tool cache in `GalaxyManagerApplication`, shared by Celery workers and the full application.
- Makes `MinimalManagerApp.error_reports` an abstract property, with an initialized backing field in the manager implementation, so the interface requires an implementation rather than merely declaring an attribute.
- Uses the job wrapper's supplied tool for error reporting, falling back to a configured toolbox only when needed and available; reporters receive `None` if neither is available.
- Skips search reindexing in manager-only applications without a toolbox, while retaining normal indexing behavior for the full application.

No new application-startup test is included; the missing manager implementation is instead checked through the existing mypy construction path.

## Validation

On Python 3.13, targeted mypy checking of the manager interface, application implementation, and Celery module passes:

```sh
MYPYPATH=lib mypy --follow-imports=silent \
    lib/galaxy/structured_app/__init__.py \
    lib/galaxy/app/__init__.py \
    lib/galaxy/celery/__init__.py
```

For the red-to-green check, temporarily removing the manager's `error_reports` property implementation produces `Cannot instantiate abstract class "GalaxyManagerApplication" with abstract attribute "error_reports"` at Celery's real app-construction call; restoring the implementation returns the check to green.

This enforces the manager's service implementation, not general definite initialization along every constructor path.

All 25 existing tests in these files pass locally:

- `test/unit/app/jobs/test_job_wrapper.py`
- `test/unit/app/test_tasks.py`
- `test/unit/app/tools/test_toolbox_search.py`

Ruff, Black, isort, and `git diff --check` also pass for the changed files; full fork CI should be checked before opening the PR against `dev`.
