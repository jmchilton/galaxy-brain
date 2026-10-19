# Unknown workflow schedulers — implementation debrief

STATUS: READY. Workflow status: `branches_implemented_needs_ci`.

Independent branch `invocation_unknown_scheduler`, based directly on dev `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`. Commit: `602b9dd46b7`. Extracted from `issue_20900_invocation_validation`; no dependency on the other extractions.

The workflow service rejects a nonempty scheduler ID absent from the existing scheduling manager registry, before building run configurations. Unknown schedulers receive HTTP 400 rather than an accepted invocation assigned to a nonexistent scheduler. Omitted IDs and configured schedulers retain their existing dispatch behavior.

## Validation and reviews

- Before the fix: omission and configured default passed; unknown scheduler was incorrectly accepted with HTTP 200 (2 passed, 1 failed in 34.65s).
- After the fix: all 3 public API cases passed in 26.57s. Exact command is in the initial debrief.
- Formatting, `git diff --check`, and all commit hooks passed.
- Normal review found no issues. Accepted the review and test challenge with no further changes; no recommendations were declined.
- Coordinator caught and corrected placement of the new test before final review, preserving both existing batch-test skip decorators. The green run used the corrected file.
- Scope review recommends retaining the scheduler-only extraction. Other service validation, tool compatibility, completion hooks, and dependency-injection changes stay separate.

The patch adds 5 production and 13 test lines. No substantial plumbing, client changes, or E2E tests require additional code-quality review, screenshots, or E2E polishing. Fork CI remains for branch management to assess.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_unknown_scheduler`.
