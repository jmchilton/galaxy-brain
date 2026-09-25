## Overview

Make `planemo shed_lint --fail_fast` stop as soon as linting reaches the configured failure level.

Closes #542. This is a fresh implementation of the intent behind #547.

## What changed

- Add a Planemo lint context that stops after the first failing linter when `--fail_fast` is enabled.
- Stop repository traversal when a shed operation returns a failure under `--fail_fast`.
- Preserve `--fail_level` semantics: warnings stop the command at the default `warn` level, but not with `--fail_level error`.
- Convert ordinary lint failures into the normal exit code 1 path instead of exposing a traceback.

## Differences from #547

#547 only converted a completed repository lint failure into an exception. It could therefore continue through every linter and every tool within that repository, and its exception was shown to the user as a traceback.

This implementation stops at both relevant levels:

1. inside a repository, after the first linter or tool failure; and
2. between repositories, after the first repository returns a failure.

The early-stop signal is caught inside the linting layer, so expected lint failures still produce a clean exit code rather than an uncaught exception.

## Tests

- `tests/test_shed_lint.py` — 9 passed
- `tests/test_lint.py` with slow/network tests disabled — 8 passed, 5 skipped
- `tests/test_shed.py tests/test_shed_expansion.py` — 2 passed, 1 skipped
- Black, isort, and flake8 pass for the changed files

The regression coverage verifies:

- malformed repository definitions retain their existing fail-fast behavior;
- a normal repository lint warning stops later linters and later repositories;
- `--fail_level error` continues past warnings;
- a multi-tool repository stops after the first failing tool; and
- expected lint failures do not emit a traceback.
