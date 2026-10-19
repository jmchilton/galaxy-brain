# invocation_unknown_scheduler

Status: `merged` — [#24169](https://github.com/galaxyproject/galaxy/pull/24169) merged 2026-10-17.

**Polish:** [PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md)

Reject unknown workflow scheduler IDs with HTTP 400 before building run configurations. Independent extraction from [issue_20900_invocation_validation](../../active/issue_20900_invocation_validation/index.md).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Commit: `56a8ac23045` (was `602b9dd46b7` on dev). On the 26.1 base, the scheduler API test has 4 cases. Red: the unknown scheduler gets a 200. Green: 4 passed.

Fork CI on dev-based `602b9dd46b7`: all green except Test Galaxy packages, whose only error is mypy `no-untyped-call` in `galaxy/security/ssh_util.py` (unrelated). Fork CI on `56a8ac23045` at PR open: all finished checks green, including API, unit, linting and Test Galaxy packages; Integration, Selenium and Integration Selenium still running.

## Morning refresh — 2026-10-16

Previous-head upstream checks were green (one skipped check). Rebased without conflicts onto actual `origin/release_26.1`; every commit patch is unchanged by range-diff. Published `01ec490cb746540000197a312c35503a5d25a831` with exact old-head force-with-lease to jmchilton and marked the PR ready under standing authorization. New-head CI is pending; prior-head green is not new-head coverage.
