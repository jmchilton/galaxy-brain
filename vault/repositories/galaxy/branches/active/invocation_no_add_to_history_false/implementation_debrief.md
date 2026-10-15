# Invocation no_add_to_history false — implementation debrief

STATUS: READY. Workflow status: `branches_implemented_needs_ci`.

Independent branch `invocation_no_add_to_history_false`, based directly on dev `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`. Commit: `f9e6dde20fa`. Extracted from `issue_20900_invocation_validation`; no dependency on that branch or the other extractions.

The invocation request now reads the boolean value of `no_add_to_history`. Omitted and false both copy an input HDA into a different target history; true preserves the opt-out. The production change is one line, with a public API regression for all three cases.

## Validation and reviews

- Before the fix: omitted passed; false failed because the destination was empty (1 failed, 1 passed; stopped at the intended failure).
- After the fix: all 3 API cases passed in 43.23s. Exact command is in the initial debrief. The shared virtualenv was activated and the upload wait set to 240 seconds after an initial environment-related upload timeout.
- Formatting, `git diff --check`, and all commit hooks passed.
- Normal review found no issues. Accepted the recommendation to retain the existing API regression; no additional changes were requested.
- Test challenge retained API coverage; browser tests are unnecessary for this API-only flag behavior.
- Scope review recommends retaining the narrow fix. Additional input-source matrices and invocation atomicity remain separate work.

No client changes, E2E tests, screenshots, or substantial plumbing changes. The branch is below the 50-line threshold for the additional code-quality review. Fork CI remains to be assessed by branch management; local test success is not a CI result.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_no_add_to_history_false`.
