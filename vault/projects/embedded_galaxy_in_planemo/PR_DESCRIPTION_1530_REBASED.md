## Overview

This is a fresh rebase and replacement for #1530, originally authored by @Smeds. The original commits are preserved with their authorship.

`planemo list_invocations` can now be run without a workflow identifier to list invocations across all workflows. Human-readable output is grouped by workflow, while `--raw` emits JSON suitable for further processing. Supplying a workflow ID or alias retains the existing filtered behavior.

The rebased implementation also:

- adds `--max-items` and `--offset-items` pagination controls;
- uses Planemo's shared table-rendering abstraction;
- avoids failing when Galaxy reports a job state Planemo does not yet know about;
- limits the final API request correctly so `--max-items` is never exceeded; and
- validates pagination values at both the CLI and API-helper boundaries.

The generated command documentation has been refreshed for the optional workflow argument and new options.

## Testing

- `pytest -q tests/test_cmd_list_invocations.py tests/test_cmd_list_workflows.py` (16 passed)
- focused `flake8`, `isort`, `ruff`, and `black --check`
- focused `mypy` for the modified command and API modules

Supersedes #1530.
