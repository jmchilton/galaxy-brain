# Initial implementation: expected workflow parameter failures

Extracted the production change from source commit `72994aa1845c4bfda11f1f4d3339832846f892b3` on `issue_20900_invocation_validation` onto independent branch `invocation_parameter_expected_failure`, based on `origin/dev` at `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_parameter_expected_failure`.

Adds `FailureReason.workflow_parameter_invalid` to `FAILURE_REASONS_EXPECTED`. The existing scheduling handler records the user-facing invocation failure and uses the expected-failure logging path for invalid workflow parameters. This avoids exception-level logging for this recognized user error; validation and invocation failure behavior stay governed by the existing handler.

The patch is one production line. The source commit's membership-only assertion was omitted: it repeats the declaration without testing scheduling behavior. Existing workflow unit tests provide regression coverage without introducing a mock scheduling harness for a logging classification change.

## Validation

- Activated the existing main Galaxy virtualenv through an ignored `.venv` symlink; no dependency installation.
- `PYTHONPATH=lib python -u -m pytest test/unit/workflows -q --tb=short`: **194 passed, 1 skipped in 39.70s**; log `/tmp/invocation-parameter-expected-unit.log`.
- `git diff --check`: passed.
- `black --check lib/galaxy/schema/invocation.py`: passed, one file unchanged (Python 3.13 warns about future Python 3.15 syntax support).

The source branch remains intact. No commits, pushes, or shared queue edits by the implementation subagent. The coordinator owns final review, validation-result recording, and handoff.
