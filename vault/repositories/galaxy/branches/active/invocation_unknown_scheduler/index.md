# invocation_unknown_scheduler

Status: `ci_wait`, draft PR [#24169](https://github.com/galaxyproject/galaxy/pull/24169) opened 2026-10-15 at John's request at `56a8ac23045`, title "[26.1] Reject unknown workflow scheduler IDs instead of queueing invocations that never run". Implementation: READY. Base: `release_26.1` (retargeted from `dev` 2026-10-15 at John's request; rebased onto `92e66c53394`). Head: `56a8ac23045`.

**Polish:** [PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md)

Reject unknown workflow scheduler IDs with HTTP 400 before building run configurations. Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Commit: `56a8ac23045` (was `602b9dd46b7` on dev). On the 26.1 base, the scheduler API test has 4 cases. Red: the unknown scheduler gets a 200. Green: 4 passed.

Fork CI on dev-based `602b9dd46b7`: all green except Test Galaxy packages, whose only error is mypy `no-untyped-call` in `galaxy/security/ssh_util.py` (unrelated). Fork CI on `56a8ac23045` at PR open: all finished checks green, including API, unit, linting and Test Galaxy packages; Integration, Selenium and Integration Selenium still running.
