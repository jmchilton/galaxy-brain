# Missing invocation inputs return 404 — implementation debrief

STATUS: READY. Workflow status: `branches_implemented_needs_ci`.

Independent branch `invocation_missing_input_404`, based directly on dev `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`. Commit: `570041b2d04`. Extracted from `issue_20900_invocation_validation`; no dependency on the other extractions.

The existing resolver now raises `ObjectNotFound` for nonexistent HDA, LDDA, library dataset, and history collection references. The response names the input step, encoded ID, and source type. Existing access assertions, copying, and the encoded-ID collection-manager call remain in place. The retained HDCA object keeps the lookup available in the session identity map for the existing manager.

## Validation and reviews

- Before the fix: all four API cases failed, returning 500/403/403/400 rather than 404 (30.84s).
- After the fix: all four cases and the existing valid collection-invocation test passed (5 passed in 29.04s). Exact command is in the initial debrief.
- Formatting, `git diff --check`, and all commit hooks passed.
- Normal review found no issues. Test challenge retained the four-source API regression; browser tests are unnecessary.
- Scope review recommends retaining the direct missing-object correction. History atomicity, deleted inputs, type/collection compatibility, and broader validation stay in the original work.
- Accepted the reviews without code changes; no recommendations were declined. The new API test shares an insertion anchor with the input-copy branch and may need a mechanical insertion-conflict resolution when both are merged; there is no behavioral dependency.

The diff is 38 additions and 2 removals across production and test code. Direct guards do not introduce substantial plumbing; additional thermo-nuclear review is not required. No client changes or E2E tests require screenshots or E2E polish. Fork CI remains for branch management to assess.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_missing_input_404`.
