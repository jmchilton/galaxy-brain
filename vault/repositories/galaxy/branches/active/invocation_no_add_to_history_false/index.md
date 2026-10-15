# invocation_no_add_to_history_false

Status: `branches_need_polish`. Implementation: READY. Base: `release_26.2` (retargeted from `dev` 2026-10-15 at John's request; rebased onto `082605cade0`).

Honor explicit `no_add_to_history: false` when invoking a workflow with an input from another history. Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Commit: `de958171049` (was `f9e6dde20fa` on `dev`; clean rebase, same patch). Local API regression: 3 passed. All commit hooks passed.

Fork CI on `f9e6dde20fa`: all green except Test Galaxy packages (3.10, 3.14), both failing on one mypy `no-untyped-call` in `galaxy/security/ssh_util.py` (pycryptodome `publickey`) — file untouched by this branch, unrelated. New-head CI pending.
