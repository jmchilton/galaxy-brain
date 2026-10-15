# invocation_no_add_to_history_false

Status: `branches_ready_for_final_review`. Base: `release_26.2` (retargeted from `dev` 2026-10-15 at John's request; rebased onto `082605cade0`).

Honor explicit `no_add_to_history: false` (and `null`) when invoking a workflow with an input from another history or library. Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md).

**[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md)**

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Commit: `e6121407400` (single commit; was `f9e6dde20fa` on `dev`, `de958171049` after rebase; polishing added an explicit-`null` test case). Local API regression on `release_26.2`: red without the fix (null, false fail; omitted, true pass), 4 passed with it.

Fork CI on `f9e6dde20fa`: all green except Test Galaxy packages (3.10, 3.14), both failing on one mypy `no-untyped-call` in `galaxy/security/ssh_util.py` (pycryptodome `publickey`) — file untouched by this branch, unrelated. CI on `e6121407400` queued at handoff.
