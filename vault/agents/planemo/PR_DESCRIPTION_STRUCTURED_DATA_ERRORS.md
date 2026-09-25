While investigating #1668, we found an independent failure in the reporting path for `planemo run`: when an engine returns an `ErrorRunResponse`, the command prints its initial failure message but then hits an assertion in `structured_data()` before it can write reports or finish the normal failure-summary path.

Standalone report generation assumed every response was a `SuccessfulRunResponse`, because only successful responses carry their runnable. Test execution already supplies this context through its `TestCase`.

This adds an optional runnable argument to `RunResponse.structured_data()` and supplies it from `planemo run`, where the runnable is already known. Failed standalone runs can then report the same artifact identifier and type as successful runs, while retaining the engine's error message and returning the intended nonzero exit status. Existing successful-response and test-case callers remain unchanged.

This is independent of #1712, which fixes the tool-specific `--no_wait` submission response. It targets `master` directly and does not depend on that PR.

## Testing

A command-level regression runs a tiny CWL tool whose command is `false` through the real `cwltool` engine, with no mocks, containers, or external services. It verifies that `planemo run` writes a schema-valid JSON report containing the artifact path, runnable type, error status, original engine message, and failure log, and exits with code 1. It uses the existing CWL test skip decorator and disables caching so the failing command is always exercised.

The same real-engine probe against the pre-fix code reproduces the assertion crash before report generation.

```console
pytest -q tests/test_run.py::RunTestCase::test_run_reports_engine_error
pytest -q tests/test_run.py::RunTestCase::test_run_cat_cwltool
```

Both tests pass, including the existing successful-run regression. Black, isort, and Ruff pass for the changed files.
