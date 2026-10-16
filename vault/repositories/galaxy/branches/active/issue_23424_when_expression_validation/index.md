# issue_23424_when_expression_validation

Status: `branches_need_decision` (refreshed 2026-10-16).

Validates workflow `when` expression input references at import.

Current pushed head: `9b008a0f5199e4a434cf3373d9ece44d0db6ad22`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23424_when_expression_validation`.

[Implementation handoff](implementation_debrief.md) · [Recovered initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review_2026-10-12.md) · [Test challenges](test_challenges_debrief.md) · [Code-quality review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md)

[Proposed PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist review](checklist_review.md) · [Description strengthening](description_strengthening.md) · [Browser test applicability](polish_e2e_tests_debrief.md)

[Tracking history](tracking_history.md)

Final review: read the proposed description, tests and comments, choose a title, and decide whether to reopen #23817 or use a fresh PR. No SHA approval is recorded.

## Requested rebase — 2026-10-12

Rebased and pushed at John's request before his decision on the closed PR.

- Actual base: `dev` at `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`.
- Previous fork head: `b909a2ce8e5b1d377ff07114817d4c274cabd874`.
- Pushed rebase head: `09ea767dd8888fef0f1885dcaf351ae0cff65bfc`.
- Rebase completed without conflicts; `git range-diff` confirms all three patches replayed identically.
- Validation: shared-spec unit test `test/unit/workflows/test_when_expression.py` passed (1 test); `git diff --check` passed. Fresh fork CI has not been assessed.
- Pushed to `jmchilton` with an exact `--force-with-lease` against the previous fork head; verified the remote head matches the current SHA.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23424_when_expression_validation`.

Opened [PR #23817](https://github.com/galaxyproject/galaxy/pull/23817) and the [updated branch comparison](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23424_when_expression_validation?expand=1) in John's browser. The PR remains closed and the queue remains `branches_need_decision`, pending his choice to reopen it or open a fresh PR.

## Recovery and polish in progress — 2026-10-12

John requested applying the current gx_workhorse implementation handoff process and POLISH_BRANCH.md to this older branch, including fixing discovered issues. Preparing a reviewed branch and proposed description; no approval to reopen or create a PR is inferred. The choice between reopening #23817 and a fresh PR remains for final review.

## Recovered implementation — 2026-10-12

Fixed the normal and strict-review findings: conservative handling of binding/scopes, Unicode identifiers, undecoded escapes and simple/nested templates; retained proven flat roots around ordinary dynamic access; removed the unused Python client-policy helper. Added API compatibility and editor-update persistence regressions and repeat migration guidance. The final 29-case suite, changed-file lint/format/import checks, analyzer type check and commit hooks pass. Changes committed and pushed at `d47f83c407c71649356c27065ea80e9ee360c531`; remote head verified. The scope recommendation is to keep the implementation as scoped.

Fork CI snapshot at 2026-10-12T11:14:50-04:00: 19 queued, one pending and two skipped, with no failures. API, unit, workflow framework and Python lint runs are queued. This is pending validation, not green CI.

## Polish completed — 2026-10-12

The general and workflow checklist review passes, with the human-read item deliberately unchecked. One fresh strengthening round found only the test runner's missing `--` separator; the proposed description now uses `-- -k`. It recommends no additional implementation work. Description, four titles and all applicable debriefs are linked above. Final human approval and PR disposition remain John's choices; fork CI remains pending with no observed failures.

## Requested test cleanup — 2026-10-12

John requested reducing expensive API combinations in favor of the exhaustive analyzer contract. Commit `9b008a0f5199e4a434cf3373d9ece44d0db6ad22` moves all 22 variations into fast backend analyzer parametrizations and leaves six representative API methods. The shared cross-language fixture and production behavior are unchanged. The accepted computed-access API test now explicitly verifies round-trip preservation.

[Normal revision review](subagents/test_cleanup_review_2026-10-12.md) and the fresh [test challenge](test_challenges_debrief.md) found no further work. General and workflow checklists were reevaluated and pass; the human-read item remains unchecked. Targeted tests: 29 passed (six API plus 23 fast tests); Ruff, Black, isort, whitespace checks and commit hooks pass. The fork head matches the pushed commit. New-head fork CI: 17 queued, three pending, two skipped, no observed failures.

The previous challenge and implementation handoff are archived in [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md). The revised description reflects the new test split and runner selector. Status remains `branches_ready_for_final_review` because these user-requested edits require a fresh read-through; no SHA approval is recorded. Closed #23817 was not reopened and no PR was created for this branch.

## Morning refresh — 2026-10-16

GitHub reconfirms #23817 closed unmerged on 2026-09-30. Moved to `branches_need_decision`; no abandonment inferred. Decision: revive/reopen this proposal or explicitly abandon it.
