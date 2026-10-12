# issue_23424_when_expression_validation

Status: `branches_need_polish`. Base: `dev`. [PR #23817](https://github.com/galaxyproject/galaxy/pull/23817) (closed).

Validates workflow `when` expression input references at import.

[Tracking history](tracking_history.md)

Decision: Decide whether to reopen #23817 or open a fresh PR.

## Requested rebase — 2026-10-12

Rebased and pushed at John's request before his decision on the closed PR.

- Actual base: `dev` at `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`.
- Previous fork head: `b909a2ce8e5b1d377ff07114817d4c274cabd874`.
- Current fork head: `09ea767dd8888fef0f1885dcaf351ae0cff65bfc`.
- Rebase completed without conflicts; `git range-diff` confirms all three patches replayed identically.
- Validation: shared-spec unit test `test/unit/workflows/test_when_expression.py` passed (1 test); `git diff --check` passed. Fresh fork CI has not been assessed.
- Pushed to `jmchilton` with an exact `--force-with-lease` against the previous fork head; verified the remote head matches the current SHA.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23424_when_expression_validation`.

Opened [PR #23817](https://github.com/galaxyproject/galaxy/pull/23817) and the [updated branch comparison](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23424_when_expression_validation?expand=1) in John's browser. The PR remains closed and the queue remains `branches_need_decision`, pending his choice to reopen it or open a fresh PR.

## Recovery and polish in progress — 2026-10-12

John requested applying the current gx_workhorse implementation handoff process and POLISH_BRANCH.md to this older branch, including fixing discovered issues. Preparing a reviewed branch and proposed description; no approval to reopen or create a PR is inferred. The choice between reopening #23817 and a fresh PR remains for final review.
