# Expected workflow parameter failures — implementation debrief

STATUS: READY. Workflow status: `branches_implemented_needs_ci`.

Independent branch `invocation_parameter_expected_failure`, based directly on dev `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`. Commit: `2bbeefcc889`. Extracted from `issue_20900_invocation_validation` source commit `72994aa1845`; no dependency on any other extraction.

Adds `workflow_parameter_invalid` to the expected invocation-failure reasons. Existing runtime validation already emits this reason; the scheduler now logs those failures at info rather than error. The same failure is still raised and recorded, and submission acceptance is unchanged.

## Validation and reviews

- Existing workflow unit suite: 194 passed, 1 skipped in 39.70s (`PYTHONPATH=lib python -u -m pytest test/unit/workflows -q --tb=short`, activated shared virtualenv).
- Formatting, `git diff --check`, and all commit hooks passed.
- Normal review found no issues and confirmed the runtime producers and logging consumer.
- Accepted the review with no changes; no recommendations were declined. Scope review recommends retaining the one-line extraction.
- No new test code: omitted the original membership-only assertion because it mirrors the declaration. The existing workflow suite was run; it is not a focused log-severity assertion. A new mocked scheduling harness would be disproportionate for this classification correction.

No client changes, E2E tests, screenshots, or substantial plumbing changes. No new tests require a test challenge; the one-line patch does not meet the additional code-quality review threshold. Fork CI remains for branch management to assess.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_parameter_expected_failure`.
